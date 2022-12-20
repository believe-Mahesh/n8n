import { Application } from 'express';
import type { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import type { IExternalHooksClass, IPersonalizationSurveyAnswers } from '@/Interfaces';

export interface JwtToken {
	token: string;
	expiresIn: number;
}

export interface JwtPayload {
	id: string;
	email: string | null;
	password: string | null;
	additionalParams?: IAdditionalParams | null;
}
export interface IAdditionalParams {
	entity_key: string | null;
	user_email: string | null;
}

export interface PublicUser {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	personalizationAnswers?: IPersonalizationSurveyAnswers | null;
	password?: string;
	passwordResetToken?: string;
	createdAt: Date;
	isPending: boolean;
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
	externalHooks: IExternalHooksClass;
	defaultCredentialsName: string;
	activeWorkflowRunner: ActiveWorkflowRunner;
}
