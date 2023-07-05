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

export const invoiceFields: INodeProperties[] = [

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
	displayOptions: {
		show: {
			resource: ['invoice'],
			operation: ['getAll'],
		},
	},
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	default: 50,
	description: 'Max number of results to return',
	typeOptions: {
		minValue: 1,
		maxValue: 1000,
	},
	displayOptions: {
		show: {
			resource: ['invoice'],
			operation: ['getAll'],
			returnAll: [false],
		},
	},
},
{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
	displayOptions: {
		show: {
			resource: ['invoice'],
			operation: ['unPaid'],
		},
	},
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	default: 50,
	description: 'Max number of results to return',
	typeOptions: {
		minValue: 1,
		maxValue: 1000,
	},
	displayOptions: {
		show: {
			resource: ['invoice'],
			operation: ['unPaid'],
			returnAll: [false],
		},
	},
}
]