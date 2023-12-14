import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeParameterValue,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

interface CustomProperty {
	name: string;
	value: string;
}

interface FilterValue {
	operation: string;
	value: NodeParameterValue;
}
interface FilterValues {
	[key: string]: FilterValue[];
}

export class Chargebee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chargebee',
		name: 'chargebee',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:chargebee.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Retrieve data from Chargebee API',
		defaults: {
			name: 'Chargebee',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'chargebeeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
					{
						name: 'Transactions',
						value: 'transactions',
					},
				],
				default: 'invoice',
			},

			// ----------------------------------
			//         customer
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['customer'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a customer',
						action: 'Create a customer',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'get a customer',
						action: 'get a customer',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'get all customer',
						action: 'get all customer',
					},
				],
				default: 'create',
			},
            
			// ----------------------------------
			//         customer:create
			// ----------------------------------
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['customer'],
					},
				},
				default: {},
				description: 'Properties to set on the new user',
				placeholder: 'Add Property',
				options: [
					{
						displayName: 'User ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID for the new customer. If not given, this will be auto-generated.',
					},
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
						description: 'The first name of the customer',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
						type: 'string',
						default: '',
						description: 'The last name of the customer',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'The email address of the customer',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'The phone number of the customer',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
						description: 'The company of the customer',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set',
									},
								],
							},
						],
					},
				],
			},

			// ----------------------------------
			//         customer:get
			// ----------------------------------
			{
				displayName: 'Company Id',
				name: 'companyId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['get'],
					},
				},
				required: true,
				default: '',
			},
			// ----------------------------------
			//         customer:getAll
			// ----------------------------------
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['getAll'],
					},
				},
				required: false,
				default: '',
			},
			// ----------------------------------
			//         invoice
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				default: 'list',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'Return the invoices',
						action: 'List an invoice',
					},
					{
						name: 'PDF Invoice URL',
						value: 'pdfUrl',
						description: 'Get URL for the invoice PDF',
						action: 'Get URL for the invoice PDF',
					},
					{
						name: 'Get An invoice',
						value: 'invoices',
						description: 'Return The Invoive Detail',
						action: 'Get The Invoive details',
					},
					{
						name: 'Update The payment status',
						value: 'payment',
						description: 'Update The Payment Status',
						action: 'Update the Payment Status',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'get all invoices',
						action: 'get all invoices',
					},
				],
			},
			// ----------------------------------
			//         invoice:get All
			// ----------------------------------
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['getAll'],
					},
				},
				required: false,
				default: '',
			},
			// ----------------------------------
			//         invoice:list
			// ----------------------------------
			
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 10,
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['invoice'],
					},
				},
				description: 'Max. amount of results to return(< 100).',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter',
				description: 'Filter for invoices',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['invoice'],
					},
				},
				options: [
					{
						name: 'date',
						displayName: 'Invoice Date',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								options: [
									{
										name: 'Is',
										value: 'is',
									},
									{
										name: 'Is Not',
										value: 'is_not',
									},
									{
										name: 'After',
										value: 'after',
									},
									{
										name: 'Before',
										value: 'before',
									},
								],
								default: 'after',
								description: 'Operation to decide where the the data should be mapped to',
							},
							{
								displayName: 'Date',
								name: 'value',
								type: 'dateTime',
								default: '',
								description: 'Query date',
							},
						],
					},
					{
						name: 'total',
						displayName: 'Invoice Amount',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								options: [
									{
										name: 'Greater Equal Than',
										value: 'gte',
									},
									{
										name: 'Greater Than',
										value: 'gt',
									},
									{
										name: 'Is',
										value: 'is',
									},
									{
										name: 'Is Not',
										value: 'is_not',
									},
									{
										name: 'Less Equal Than',
										value: 'lte',
									},
									{
										name: 'Less Than',
										value: 'lt',
									},
								],
								default: 'gt',
								description: 'Operation to decide where the the data should be mapped to',
							},
							{
								displayName: 'Amount',
								name: 'value',
								type: 'number',
								typeOptions: {
									numberPrecision: 2,
								},
								default: 0,
								description: 'Query amount',
							},
						],
					},
				],
			},

			// ----------------------------------
			//         invoice:pdfUrl
			// ----------------------------------
			{
				displayName: 'Invoice ID',
				name: 'invoiceId',
				description: 'The ID of the invoice to get',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['pdfUrl'],
						resource: ['invoice'],
					},
				},
			},
			{
				displayName: 'Invoice ',
				name: 'invoiceIds',
				description: 'The ID of the invoice to get',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['invoices'],
						resource: ['invoice'],
					},
				},
			},
			{
				displayName: 'Invoice Id',
				name: 'invoiceId',
				description: 'The Payment of the invoice to be Updated',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['payment'],
						resource: ['invoice'],
					},
				},
			},
			{
				displayName: 'Payment Amount',
				name: 'paymentAmount',
				description: 'The Payment to be Updated',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['payment'],
						resource: ['invoice'],
					},
				},
			},
			{
				displayName: 'Payment Method',
				name: 'paymentMethod',
				description: 'The Payment method to be Updated',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['payment'],
						resource: ['invoice'],
					},
				},
			},
			// ----------------------------------
			//         subscription
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['subscription'],
					},
				},
				options: [
					{
						name: 'Cancel',
						value: 'cancel',
						description: 'Cancel a subscription',
						action: 'Cancel a subscription',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a subscription',
						action: 'Delete a subscription',
					},
				],
				default: 'delete',
			},

			// ----------------------------------
			//         subscription:cancel
			// ----------------------------------
			{
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				description: 'The ID of the subscription to cancel',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['cancel'],
						resource: ['subscription'],
					},
				},
			},
			{
				displayName: 'Schedule End of Term',
				name: 'endOfTerm',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['cancel'],
						resource: ['subscription'],
					},
				},
				description:
					'Whether it will not cancel it directly in will instead schedule the cancelation for the end of the term',
			},

			// ----------------------------------
			//         subscription:delete
			// ----------------------------------
			{
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				description: 'The ID of the subscription to delete',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['subscription'],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transactions'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'get a transaction',
						action: 'get a transaction',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'get all transaction',
						action: 'get all transaction',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Transaction Id',
				name: 'transactionId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['transactions'],
						operation: ['get'],
					},
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['transactions'],
						operation: ['getAll'],
					},
				},
				required: false,
				default: '',
			},
		],
	};
	

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let _item: INodeExecutionData;

		const credentials = await this.getCredentials('chargebeeApi');

		const baseUrl = `https://${credentials.accountName}.chargebee.com/api/v2`;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			try {
				_item = items[i];
				const resource = this.getNodeParameter('resource', i);
				const operation = this.getNodeParameter('operation', i);

				let requestMethod = 'GET';
				let endpoint = '';
				body = {};
				qs = {};
				if (resource === 'customer') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';

						const properties = this.getNodeParameter('properties', i, {}) as IDataObject;

						for (const key of Object.keys(properties)) {
							if (
								key === 'customProperties' &&
								(properties.customProperties as IDataObject).property !== undefined
							) {
								for (const customProperty of (properties.customProperties as IDataObject)!
									.property! as CustomProperty[]) {
									qs[customProperty.name] = customProperty.value;
								}
							} else {
								qs[key] = properties[key];
							}
						}

						endpoint = 'customers';
					} else if(operation === 'get') {
						requestMethod = 'GET';
						const companyId = this.getNodeParameter('companyId', i) as string;
						endpoint = `customers/${companyId.trim()}`;
					} 
					  else if (operation=== 'getAll')
		             {
						requestMethod = 'GET';
						const offset = this.getNodeParameter('offset', i) as string;
						if(offset){
						endpoint = `customers?offset=${offset.trim()}`;
						}
						else
						{
							endpoint = `customers`;
						}
					 }
					else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'invoice') {
					if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						endpoint = 'invoices';
						// TODO: Make also sorting configurable
						qs['sort_by[desc]'] = 'date';

						qs.limit = this.getNodeParameter('maxResults', i, {});

						const setFilters: FilterValues = this.getNodeParameter(
							'filters',
							i,
							{},
						) as unknown as FilterValues;

						let filter: FilterValue;
						let value: NodeParameterValue;

						for (const filterProperty of Object.keys(setFilters)) {
							for (filter of setFilters[filterProperty]) {
								value = filter.value;
								if (filterProperty === 'date') {
									value = Math.floor(new Date(value as string).getTime() / 1000);
								}
								qs[`${filterProperty}[${filter.operation}]`] = value;
							}
						}
					} else if (operation === 'pdfUrl') {
						// ----------------------------------
						//         pdfUrl
						// ----------------------------------

						requestMethod = 'POST';
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						endpoint = `invoices/${invoiceId.trim()}/pdf`;
					} 
					else if (operation === 'getAll') {
						// ----------------------------------
						//         Get an invoice number
						// ----------------------------------

						requestMethod = 'GET';
						const offset = this.getNodeParameter('offset', i) as string;
						if(offset){
						endpoint = `invoices?offset=${offset.trim()}`;
						}
						else
						{
							endpoint = `invoices`;
						}
					} 
					else if (operation === 'invoices') {
						requestMethod = 'GET';
						const invoiceIds = this.getNodeParameter('invoiceIds', i) as string;
						endpoint = `invoices/${invoiceIds.trim()}`;
					}
					else if (operation === 'payment') {
						// ----------------------------------
						//        Payment Update
						// ----------------------------------

						requestMethod = 'POST';
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						const paymentAmount = this.getNodeParameter('paymentAmount', i) as string;
						const paymentMethod = this.getNodeParameter('paymentMethod', i) as string;
						endpoint = `invoices/${invoiceId.trim()}/record_payment?comment=Paymentreceived&transaction[amount]=${paymentAmount}&transaction[payment_method]=${paymentMethod}`;
					}
					else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'subscription') {
					if (operation === 'cancel') {
						// ----------------------------------
						//         cancel
						// ----------------------------------

						requestMethod = 'POST';

						const subscriptionId = this.getNodeParameter('subscriptionId', i, '') as string;
						body.end_of_term = this.getNodeParameter('endOfTerm', i, false) as boolean;

						endpoint = `subscriptions/${subscriptionId.trim()}/cancel`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'POST';

						const subscriptionId = this.getNodeParameter('subscriptionId', i, '') as string;

						endpoint = `subscriptions/${subscriptionId.trim()}/delete`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'transactions') {
					 if(operation === 'get') {
						requestMethod = 'GET';
						const transactionId = this.getNodeParameter('transactionId', i) as string;
						endpoint = `transactions/${transactionId.trim()}`;
					} 
					  else if (operation=== 'getAll')
		             {
						requestMethod = 'GET';
						const offset = this.getNodeParameter('offset', i) as string;
						if (offset)
						{
						endpoint = `transactions?offset=${offset.trim()}`;
						}
						else{
							endpoint = `transactions`;
						}
					 }
					else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				}
				else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				const options = {
					method: requestMethod,
					body,
					qs,
					uri: `${baseUrl}/${endpoint}`,
					auth: {
						user: credentials.apiKey as string,
						pass: '',
					},
					json: true,
				};

				let responseData;

				try {
					responseData = await this.helpers.request(options);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				if (resource === 'invoice' && operation === 'list') {
					responseData.list.forEach((data: IDataObject) => {
						responseData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ ...(data.invoice as IDataObject) }),
							{ itemData: { item: i } },
						);
						returnData.push(...responseData);
					});
				} else if (resource === 'invoice' && operation === 'pdfUrl') {
					const data: IDataObject = {};
					Object.assign(data, items[i].json);

					data.pdfUrl = responseData.download.download_url;
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ ...data }),
						{ itemData: { item: i } },
					);
					returnData.push(...responseData);
				} else {
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {}, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
