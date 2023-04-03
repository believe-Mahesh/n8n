import type { Repository } from 'typeorm';
import { IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { v4 as uuid } from 'uuid';
import validator from 'validator';
import { Get, Post, RestController } from '@/decorators';
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
	UnprocessableRequestError,
} from '@/ResponseHelper';
import {
	getInstanceBaseUrl,
	hashPassword,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import type { UserManagementMailer } from '@/UserManagement/email';

import { Response } from 'express';
import { ErrorReporterProxy as ErrorReporter, ILogger } from 'n8n-workflow';
import type { Config } from '@/config';
import { User } from '@db/entities/User';
import { PasswordResetRequest } from '@/requests';
import type { IDatabaseCollections, IExternalHooksClass, IInternalHooksClass } from '@/Interfaces';
import { issueCookie, setCookie } from '@/auth/jwt';
import { isLdapEnabled } from '@/Ldap/helpers';
import { Role } from '@/databases/entities/Role';
import { randomBytes } from 'crypto';

import { isSamlCurrentAuthenticationMethod } from '../sso/ssoHelpers';

@RestController()
export class PasswordResetController {
	private readonly config: Config;

	private readonly logger: ILogger;

	private readonly externalHooks: IExternalHooksClass;

	private readonly internalHooks: IInternalHooksClass;

	private userRepository: Repository<User>;

	private roleRepository: Repository<Role>;

	private readonly mailer: UserManagementMailer;


	constructor({
		config,
		logger,
		externalHooks,
		internalHooks,
		mailer,
		repositories,
	}: {
		config: Config;
		logger: ILogger;
		externalHooks: IExternalHooksClass;
		internalHooks: IInternalHooksClass;
		repositories: Pick<IDatabaseCollections, 'User' | 'Role'>;
		mailer: UserManagementMailer;
	}) {
		this.config = config;
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.internalHooks = internalHooks;
		this.mailer = mailer;
		this.userRepository = repositories.User;
		this.roleRepository = repositories.Role;
	}

	/**
	 * Send a password reset email.
	 * Authless endpoint.
	 */
	@Post('/forgot-password')
	async forgotPassword(req: PasswordResetRequest.Email) {
		if (this.config.getEnv('userManagement.emails.mode') === '') {
			this.logger.debug(
				'Request to send password reset email failed because emailing was not set up',
			);
			throw new InternalServerError(
				'Email sending must be set up in order to request a password reset email',
			);
		}

		const { email } = req.body;
		if (!email) {
			this.logger.debug(
				'Request to send password reset email failed because of missing email in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('Email is mandatory');
		}

		if (!validator.isEmail(email)) {
			this.logger.debug(
				'Request to send password reset email failed because of invalid email in payload',
				{ invalidEmail: email },
			);
			throw new BadRequestError('Invalid email address');
		}

		// User should just be able to reset password if one is already present
		const user = await this.userRepository.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities', 'globalRole'],
		});

		if (isSamlCurrentAuthenticationMethod() && user?.globalRole.name !== 'owner') {
			this.logger.debug(
				'Request to send password reset email failed because login is handled by SAML',
			);
			throw new UnauthorizedError(
				'Login is handled by SAML. Please contact your Identity Provider to reset your password.',
			);
		}

		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');

		if (!user?.password || (ldapIdentity && user.disabled)) {
			this.logger.debug(
				'Request to send password reset email failed because no user was found for the provided email',
				{ invalidEmail: email },
			);
			return;
		}

		if (isLdapEnabled() && ldapIdentity) {
			throw new UnprocessableRequestError('forgotPassword.ldapUserPasswordResetUnavailable');
		}

		user.resetPasswordToken = uuid();

		const { id, firstName, lastName, resetPasswordToken } = user;

		const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 7200;

		await this.userRepository.update(id, { resetPasswordToken, resetPasswordTokenExpiration });

		const baseUrl = getInstanceBaseUrl();
		const url = new URL(`${baseUrl}/change-password`);
		url.searchParams.append('userId', id);
		url.searchParams.append('token', resetPasswordToken);

		try {
			await this.mailer.passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url.toString(),
				domain: baseUrl,
			});
		} catch (error) {
			void this.internalHooks.onEmailFailed({
				user,
				message_type: 'Reset password',
				public_api: false,
			});
			if (error instanceof Error) {
				throw new InternalServerError(`Please contact your administrator: ${error.message}`);
			}
		}

		this.logger.info('Sent password reset email successfully', { userId: user.id, email });
		void this.internalHooks.onUserTransactionalEmail({
			user_id: id,
			message_type: 'Reset password',
			public_api: false,
		});

		void this.internalHooks.onUserPasswordResetRequestClick({ user });
	}

	/**
	 * Verify password reset token and user ID.
	 * Authless endpoint.
	 */
	@Get('/resolve-password-token')
	async resolvePasswordToken(req: PasswordResetRequest.Credentials) {
		const { token: resetPasswordToken, userId: id } = req.query;

		if (!resetPasswordToken || !id) {
			this.logger.debug(
				'Request to resolve password token failed because of missing password reset token or user ID in query string',
				{
					queryString: req.query,
				},
			);
			throw new BadRequestError('');
		}

		// Timestamp is saved in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);

		const user = await this.userRepository.findOneBy({
			id,
			resetPasswordToken,
			resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID and reset password token',
				{
					userId: id,
					resetPasswordToken,
				},
			);
			throw new NotFoundError('');
		}

		this.logger.info('Reset-password token resolved successfully', { userId: id });
		void this.internalHooks.onUserPasswordResetEmailClick({ user });
	}

	/**
	 * Verify password reset token and user ID and update password.
	 * Authless endpoint.
	 */
	@Post('/change-password')
	async changePassword(req: PasswordResetRequest.NewPassword, res: Response) {
		const { token: resetPasswordToken, userId, password } = req.body;

		if (!resetPasswordToken || !userId || !password) {
			this.logger.debug(
				'Request to change password failed because of missing user ID or password or reset password token in payload',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Missing user ID or password or reset password token');
		}

		const validPassword = validatePassword(password);

		// Timestamp is saved in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);

		const user = await this.userRepository.findOne({
			where: {
				id: userId,
				resetPasswordToken,
				resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
			},
			relations: ['authIdentities'],
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID and reset password token',
				{
					userId,
					resetPasswordToken,
				},
			);
			throw new NotFoundError('');
		}

		await this.userRepository.update(userId, {
			password: await hashPassword(validPassword),
			resetPasswordToken: null,
			resetPasswordTokenExpiration: null,
		});

		this.logger.info('User password updated successfully', { userId });

		await issueCookie(res, user);

		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: ['password'],
		});

		// if this user used to be an LDAP users
		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (ldapIdentity) {
			void this.internalHooks.onUserSignup(user, {
				user_type: 'email',
				was_disabled_ldap_user: true,
			});
		}

		await this.externalHooks.run('user.password.update', [user.email, password]);
	}

	@Post('/authentication')
	async authenticate(req: any, res: any) {
		const { token } = req.query;
		await setCookie(res, token)
	}


	@Post('/create-user')
	async createUser(req: any, res: any) {
		//res.writeHead(200, {'content-type': 'application/json'})
		this.logger.debug(req.body)
		const { emailId, firstName, lastName, password } = req.body;
		const usersToSetUp = [ emailId ];
		const role = await this.roleRepository.findOneBy({ scope: 'global', name: 'member' });
		const pwd = await hashPassword(password);
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;
		//let user = Object.assign(new User(), {});
		let user = [];
		try {
			user = await this.userRepository.manager.transaction(async (transactionManager) => {
				return Promise.all(
					usersToSetUp.map(async (email) => {
						const newUser = Object.assign(new User(), {
							email,
							globalRole: role,
							firstName,
							lastName,
							password: pwd,
							apiKey
						});
						const savedUser = await transactionManager.save<User>(newUser);
						return savedUser;
					}),
				);
			});

		} catch (error) {
			ErrorReporter.error(error);
			throw new InternalServerError('An error occurred during user creation');
		}
		await issueCookie(res, user[0]);
		return {apiKey: apiKey}
	}
}
