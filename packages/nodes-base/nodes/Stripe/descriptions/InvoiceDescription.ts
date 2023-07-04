import type { INodeProperties } from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'GetAll',
				value: 'getAll',
				description: 'Get all Invoices',
				action: 'Get all Invoices',
			},
            {
				name: 'unpaid',
				value: 'unPaid',
				description: 'Get all Unpaid Invoices',
				action: 'Get all Unpaid Invoices',
			},
		],
		displayOptions: {
			show: {
				resource: ['invoice'],
			},
		},
	},
];
