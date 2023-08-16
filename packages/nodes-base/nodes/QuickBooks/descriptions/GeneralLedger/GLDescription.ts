import type { INodeProperties } from 'n8n-workflow';

export const GLOperations: INodeProperties [] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get General Ledger',
			},
		],
		displayOptions: {
			show: {
				resource: ['gl'],
			},
		},
	},
]

export const GLFields: INodeProperties [] = [
	{
		displayName: 'Start Date',
		name: 'start_date',
		type: 'string',
		required: true,
		default: '',
		description: 'Start date of the year for ledger',
		displayOptions: {
			show: {
				resource: ['gl'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'end_date',
		type: 'string',
		required: true,
		default: '',
		description: 'End date of the year for ledger',
		displayOptions: {
			show: {
				resource: ['gl'],
				operation: ['get'],
			},
		},
	},
]
