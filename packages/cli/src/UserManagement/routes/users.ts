/* eslint-disable no-restricted-syntax */
import { Response } from 'express';
import { ErrorReporterProxy as ErrorReporter, LoggerProxy as Logger } from 'n8n-workflow';
import { In } from 'typeorm';
import validator from 'validator';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import { ITelemetryUserDeletionData } from '@/Interfaces';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { User } from '@db/entities/User';
import { UserRequest } from '@/requests';
import * as UserManagementMailer from '../email/UserManagementMailer';
import { N8nApp, PublicUser } from '../Interfaces';
import {
	addInviteLinktoUser,
	generateUserInviteUrl,
	getInstanceBaseUrl,
	hashPassword,
	isEmailSetUp,
	isUserManagementDisabled,
	sanitizeUser,
	validatePassword,
} from '../UserManagementHelper';

import config from '@/config';
import { issueCookie, setCookie } from '../auth/jwt';
import { InternalHooksManager } from '@/InternalHooksManager';
import { RoleService } from '@/role/role.service';
import { randomBytes } from 'crypto';

export function usersNamespace(this: N8nApp): void {
	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */
	this.app.post(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: UserRequest.Invite) => {
			const mailer = UserManagementMailer.getInstance();

			// TODO: this should be checked in the middleware rather than here
			if (isUserManagementDisabled()) {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because user management is disabled',
				);
				throw new ResponseHelper.BadRequestError('User management is disabled');
			}

			if (!config.getEnv('userManagement.isInstanceOwnerSetUp')) {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because the owner account is not set up',
				);
				throw new ResponseHelper.BadRequestError(
					'You must set up your own account before inviting others',
				);
			}

			if (!Array.isArray(req.body)) {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because the payload is not an array',
					{
						payload: req.body,
					},
				);
				throw new ResponseHelper.BadRequestError('Invalid payload');
			}

			if (!req.body.length) return [];

			const createUsers: { [key: string]: string | null } = {};
			// Validate payload
			req.body.forEach((invite) => {
				if (typeof invite !== 'object' || !invite.email) {
					throw new ResponseHelper.BadRequestError(
						'Request to send email invite(s) to user(s) failed because the payload is not an array shaped Array<{ email: string }>',
					);
				}

				if (!validator.isEmail(invite.email)) {
					Logger.debug('Invalid email in payload', { invalidEmail: invite.email });
					throw new ResponseHelper.BadRequestError(
						`Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
					);
				}
				createUsers[invite.email.toLowerCase()] = null;
			});

			const role = await Db.collections.Role.findOne({ scope: 'global', name: 'member' });

			if (!role) {
				Logger.error(
					'Request to send email invite(s) to user(s) failed because no global member role was found in database',
				);
				throw new ResponseHelper.InternalServerError(
					'Members role not found in database - inconsistent state',
				);
			}

			// remove/exclude existing users from creation
			const existingUsers = await Db.collections.User.find({
				where: { email: In(Object.keys(createUsers)) },
			});
			existingUsers.forEach((user) => {
				if (user.password) {
					delete createUsers[user.email];
					return;
				}
				createUsers[user.email] = user.id;
			});

			const usersToSetUp = Object.keys(createUsers).filter((email) => createUsers[email] === null);
			const total = usersToSetUp.length;

			Logger.debug(total > 1 ? `Creating ${total} user shells...` : 'Creating 1 user shell...');

			try {
				await Db.transaction(async (transactionManager) => {
					return Promise.all(
						usersToSetUp.map(async (email) => {
							const newUser = Object.assign(new User(), {
								email,
								globalRole: role,
							});
							const savedUser = await transactionManager.save<User>(newUser);
							createUsers[savedUser.email] = savedUser.id;
							return savedUser;
						}),
					);
				});
			} catch (error) {
				ErrorReporter.error(error);
				Logger.error('Failed to create user shells', { userShells: createUsers });
				throw new ResponseHelper.InternalServerError('An error occurred during user creation');
			}

			Logger.debug('Created user shell(s) successfully', { userId: req.user.id });
			Logger.verbose(total > 1 ? `${total} user shells created` : '1 user shell created', {
				userShells: createUsers,
			});

			const baseUrl = getInstanceBaseUrl();

			const usersPendingSetup = Object.entries(createUsers).filter(([email, id]) => id && email);

			// send invite email to new or not yet setup users

			const emailingResults = await Promise.all(
				usersPendingSetup.map(async ([email, id]) => {
					if (!id) {
						// This should never happen since those are removed from the list before reaching this point
						throw new ResponseHelper.InternalServerError(
							'User ID is missing for user with email address',
						);
					}
					const inviteAcceptUrl = generateUserInviteUrl(req.user.id, id);
					const resp: {
						user: { id: string | null; email: string; inviteAcceptUrl: string; emailSent: boolean };
						error?: string;
					} = {
						user: {
							id,
							email,
							inviteAcceptUrl,
							emailSent: false,
						},
					};
					try {
						const result = await mailer.invite({
							email,
							inviteAcceptUrl,
							domain: baseUrl,
						});
						if (result.emailSent) {
							resp.user.emailSent = true;
							void InternalHooksManager.getInstance().onUserTransactionalEmail({
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								user_id: id,
								message_type: 'New user invite',
								public_api: false,
							});
						}

						void InternalHooksManager.getInstance().onUserInvite({
							user: req.user,
							target_user_id: Object.values(createUsers) as string[],
							public_api: false,
							email_sent: result.emailSent,
						});
					} catch (error) {
						if (error instanceof Error) {
							void InternalHooksManager.getInstance().onEmailFailed({
								user: req.user,
								message_type: 'New user invite',
								public_api: false,
							});
							Logger.error('Failed to send email', {
								userId: req.user.id,
								inviteAcceptUrl,
								domain: baseUrl,
								email,
							});
							resp.error = error.message;
						}
					}
					return resp;
				}),
			);

			await this.externalHooks.run('user.invited', [usersToSetUp]);

			Logger.debug(
				usersPendingSetup.length > 1
					? `Sent ${usersPendingSetup.length} invite emails successfully`
					: 'Sent 1 invite email successfully',
				{ userShells: createUsers },
			);

			return emailingResults;
		}),
	);

	/**
	 * Validate invite token to enable invitee to set up their account.
	 *
	 * Authless endpoint.
	 */
	this.app.get(
		`/${this.restEndpoint}/resolve-signup-token`,
		ResponseHelper.send(async (req: UserRequest.ResolveSignUp) => {
			const { inviterId, inviteeId } = req.query;

			if (!inviterId || !inviteeId) {
				Logger.debug(
					'Request to resolve signup token failed because of missing user IDs in query string',
					{ inviterId, inviteeId },
				);
				throw new ResponseHelper.BadRequestError('Invalid payload');
			}

			// Postgres validates UUID format
			for (const userId of [inviterId, inviteeId]) {
				if (!validator.isUUID(userId)) {
					Logger.debug('Request to resolve signup token failed because of invalid user ID', {
						userId,
					});
					throw new ResponseHelper.BadRequestError('Invalid userId');
				}
			}

			const users = await Db.collections.User.find({ where: { id: In([inviterId, inviteeId]) } });

			if (users.length !== 2) {
				Logger.debug(
					'Request to resolve signup token failed because the ID of the inviter and/or the ID of the invitee were not found in database',
					{ inviterId, inviteeId },
				);
				throw new ResponseHelper.BadRequestError('Invalid invite URL');
			}

			const invitee = users.find((user) => user.id === inviteeId);

			if (!invitee || invitee.password) {
				Logger.error('Invalid invite URL - invitee already setup', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.BadRequestError(
					'The invitation was likely either deleted or already claimed',
				);
			}

			const inviter = users.find((user) => user.id === inviterId);

			if (!inviter?.email || !inviter?.firstName) {
				Logger.error(
					'Request to resolve signup token failed because inviter does not exist or is not set up',
					{
						inviterId: inviter?.id,
					},
				);
				throw new ResponseHelper.BadRequestError('Invalid request');
			}

			void InternalHooksManager.getInstance().onUserInviteEmailClick({
				inviter,
				invitee,
			});

			const { firstName, lastName } = inviter;

			return { inviter: { firstName, lastName } };
		}),
	);

	this.app.post(`/${this.restEndpoint}/authentication`, ResponseHelper.send(async (req: any, res: any) => {
		const { token } = req.query;
		await setCookie(res, token)
	}));


	this.app.post(`/${this.restEndpoint}/create-user`, ResponseHelper.send(async (req: any, res: any) => {
		console.log('the req value is ', req)
		console.log('the res value is ', res)
		//res.writeHead(200, {'content-type': 'application/json'})
		console.log(req.body)
		const { emailId, firstName, lastName, password } = req.body;
		const usersToSetUp = [ emailId ];
		const role = await Db.collections.Role.findOne({ scope: 'global', name: 'member' });
		const pwd = await hashPassword(password);
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;
		//let user = Object.assign(new User(), {});
		let user = [];
		try {
			user = await Db.transaction(async (transactionManager) => {
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
						//createUsers[savedUser.email] = savedUser.id;
						return savedUser;
					}),
				);
			});

			// void InternalHooksManager.getInstance().onUserInvite({
			// 	user_id: req.user.id,
			// 	target_user_id: Object.values(createUsers) as string[],
			// 	public_api: false,
			// });
		} catch (error) {
			ErrorReporter.error(error);
			//Logger.error('Failed to create user shells', { userShells: createUsers });
			throw new ResponseHelper.InternalServerError('An error occurred during user creation');
		}
		await issueCookie(res, user[0]);
		return {apiKey: apiKey}
	}));

	/**
	 * Fill out user shell with first name, last name, and password.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/users/:id`,
		ResponseHelper.send(async (req: UserRequest.Update, res: Response) => {
			const { id: inviteeId } = req.params;

			const { inviterId, firstName, lastName, password } = req.body;

			if (!inviterId || !inviteeId || !firstName || !lastName || !password) {
				Logger.debug(
					'Request to fill out a user shell failed because of missing properties in payload',
					{ payload: req.body },
				);
				throw new ResponseHelper.BadRequestError('Invalid payload');
			}

			const validPassword = validatePassword(password);

			const users = await Db.collections.User.find({
				where: { id: In([inviterId, inviteeId]) },
				relations: ['globalRole'],
			});

			if (users.length !== 2) {
				Logger.debug(
					'Request to fill out a user shell failed because the inviter ID and/or invitee ID were not found in database',
					{
						inviterId,
						inviteeId,
					},
				);
				throw new ResponseHelper.BadRequestError('Invalid payload or URL');
			}

			const invitee = users.find((user) => user.id === inviteeId) as User;

			if (invitee.password) {
				Logger.debug(
					'Request to fill out a user shell failed because the invite had already been accepted',
					{ inviteeId },
				);
				throw new ResponseHelper.BadRequestError('This invite has been accepted already');
			}

			invitee.firstName = firstName;
			invitee.lastName = lastName;
			invitee.password = await hashPassword(validPassword);

			const updatedUser = await Db.collections.User.save(invitee);

			await issueCookie(res, updatedUser);

			void InternalHooksManager.getInstance().onUserSignup({
				user: updatedUser,
			});

			await this.externalHooks.run('user.profile.update', [invitee.email, sanitizeUser(invitee)]);
			await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);

			return sanitizeUser(updatedUser);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: UserRequest.List) => {
			const users = await Db.collections.User.find({ relations: ['globalRole'] });

			return users.map(
				(user): PublicUser =>
					addInviteLinktoUser(sanitizeUser(user, ['personalizationAnswers']), req.user.id),
			);
		}),
	);

	/**
	 * Delete a user. Optionally, designate a transferee for their workflows and credentials.
	 */
	this.app.delete(
		`/${this.restEndpoint}/users/:id`,
		// @ts-ignore
		ResponseHelper.send(async (req: UserRequest.Delete) => {
			const { id: idToDelete } = req.params;

			if (req.user.id === idToDelete) {
				Logger.debug(
					'Request to delete a user failed because it attempted to delete the requesting user',
					{ userId: req.user.id },
				);
				throw new ResponseHelper.BadRequestError('Cannot delete your own user');
			}

			const { transferId } = req.query;

			if (transferId === idToDelete) {
				throw new ResponseHelper.BadRequestError(
					'Request to delete a user failed because the user to delete and the transferee are the same user',
				);
			}

			const users = await Db.collections.User.find({
				where: { id: In([transferId, idToDelete]) },
			});

			if (!users.length || (transferId && users.length !== 2)) {
				throw new ResponseHelper.NotFoundError(
					'Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB',
				);
			}

			const userToDelete = users.find((user) => user.id === req.params.id) as User;

			const telemetryData: ITelemetryUserDeletionData = {
				user_id: req.user.id,
				target_user_old_status: userToDelete.isPending ? 'invited' : 'active',
				target_user_id: idToDelete,
			};

			telemetryData.migration_strategy = transferId ? 'transfer_data' : 'delete_data';

			if (transferId) {
				telemetryData.migration_user_id = transferId;
			}

			const [workflowOwnerRole, credentialOwnerRole] = await Promise.all([
				RoleService.get({ name: 'owner', scope: 'workflow' }),
				RoleService.get({ name: 'owner', scope: 'credential' }),
			]);

			if (transferId) {
				const transferee = users.find((user) => user.id === transferId);

				await Db.transaction(async (transactionManager) => {
					// Get all workflow ids belonging to user to delete
					const sharedWorkflowIds = await transactionManager
						.getRepository(SharedWorkflow)
						.find({
							select: ['workflowId'],
							where: { userId: userToDelete.id, role: workflowOwnerRole },
						})
						.then((sharedWorkflows) => sharedWorkflows.map(({ workflowId }) => workflowId));

					// Prevents issues with unique key constraints since user being assigned
					// workflows and credentials might be a sharee
					await transactionManager.delete(SharedWorkflow, {
						user: transferee,
						workflowId: In(sharedWorkflowIds),
					});

					// Transfer ownership of owned workflows
					await transactionManager.update(
						SharedWorkflow,
						{ user: userToDelete, role: workflowOwnerRole },
						{ user: transferee },
					);

					// Now do the same for creds

					// Get all workflow ids belonging to user to delete
					const sharedCredentialIds = await transactionManager
						.getRepository(SharedCredentials)
						.find({
							select: ['credentialsId'],
							where: { user: userToDelete, role: credentialOwnerRole },
						})
						.then((sharedCredentials) =>
							sharedCredentials.map(({ credentialsId }) => credentialsId),
						);

					// Prevents issues with unique key constraints since user being assigned
					// workflows and credentials might be a sharee
					await transactionManager.delete(SharedCredentials, {
						user: transferee,
						credentialsId: In(sharedCredentialIds),
					});

					// Transfer ownership of owned credentials
					await transactionManager.update(
						SharedCredentials,
						{ user: userToDelete, role: credentialOwnerRole },
						{ user: transferee },
					);

					// This will remove all shared workflows and credentials not owned
					await transactionManager.delete(User, { id: userToDelete.id });
				});

				void InternalHooksManager.getInstance().onUserDeletion({
					user: req.user,
					telemetryData,
					publicApi: false,
				});
				await this.externalHooks.run('user.deleted', [sanitizeUser(userToDelete)]);
				return { success: true };
			}

			const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
				Db.collections.SharedWorkflow.find({
					relations: ['workflow'],
					where: { user: userToDelete, role: workflowOwnerRole },
				}),
				Db.collections.SharedCredentials.find({
					relations: ['credentials'],
					where: { user: userToDelete, role: credentialOwnerRole },
				}),
			]);

			await Db.transaction(async (transactionManager) => {
				const ownedWorkflows = await Promise.all(
					ownedSharedWorkflows.map(async ({ workflow }) => {
						if (workflow.active) {
							// deactivate before deleting
							await this.activeWorkflowRunner.remove(workflow.id);
						}
						return workflow;
					}),
				);
				await transactionManager.remove(ownedWorkflows);
				await transactionManager.remove(
					ownedSharedCredentials.map(({ credentials }) => credentials),
				);
				await transactionManager.delete(User, { id: userToDelete.id });
			});

			void InternalHooksManager.getInstance().onUserDeletion({
				user: req.user,
				telemetryData,
				publicApi: false,
			});

			await this.externalHooks.run('user.deleted', [sanitizeUser(userToDelete)]);
			return { success: true };
		}),
	);

	/**
	 * Resend email invite to user.
	 */
	this.app.post(
		`/${this.restEndpoint}/users/:id/reinvite`,
		ResponseHelper.send(async (req: UserRequest.Reinvite) => {
			const { id: idToReinvite } = req.params;

			if (!isEmailSetUp()) {
				Logger.error('Request to reinvite a user failed because email sending was not set up');
				throw new ResponseHelper.InternalServerError(
					'Email sending must be set up in order to invite other users',
				);
			}

			const reinvitee = await Db.collections.User.findOne({ id: idToReinvite });

			if (!reinvitee) {
				Logger.debug(
					'Request to reinvite a user failed because the ID of the reinvitee was not found in database',
				);
				throw new ResponseHelper.NotFoundError('Could not find user');
			}

			if (reinvitee.password) {
				Logger.debug(
					'Request to reinvite a user failed because the invite had already been accepted',
					{ userId: reinvitee.id },
				);
				throw new ResponseHelper.BadRequestError('User has already accepted the invite');
			}

			const baseUrl = getInstanceBaseUrl();
			const inviteAcceptUrl = `${baseUrl}/signup?inviterId=${req.user.id}&inviteeId=${reinvitee.id}`;

			const mailer = UserManagementMailer.getInstance();
			try {
				const result = await mailer.invite({
					email: reinvitee.email,
					inviteAcceptUrl,
					domain: baseUrl,
				});
				if (result.emailSent) {
					void InternalHooksManager.getInstance().onUserReinvite({
						user: req.user,
						target_user_id: reinvitee.id,
						public_api: false,
					});

					void InternalHooksManager.getInstance().onUserTransactionalEmail({
						user_id: reinvitee.id,
						message_type: 'Resend invite',
						public_api: false,
					});
				}
			} catch (error) {
				void InternalHooksManager.getInstance().onEmailFailed({
					user: reinvitee,
					message_type: 'Resend invite',
					public_api: false,
				});
				Logger.error('Failed to send email', {
					email: reinvitee.email,
					inviteAcceptUrl,
					domain: baseUrl,
				});
				throw new ResponseHelper.InternalServerError(`Failed to send email to ${reinvitee.email}`);
			}
			return { success: true };
		}),
	);
}
