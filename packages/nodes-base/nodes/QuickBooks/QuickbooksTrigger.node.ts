import type {
	IDataObject,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class QuickbooksTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Quickbooks Trigger',
		name: 'quickbooksTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:quickbooks.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Quickbooks events occur',
		defaults: {
			name: 'Quickbooks Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event)',
					},
					{
						name: 'Invoice Emailed',
						value: 'invoice_emailed',
						description: 'Triggered when an invoice is emailed',
					},
					{
						name: 'Invoice Update',
						value: 'invoice_update',
						description: 'Triggered when an invoice is updated',
					},
                    {
						name: 'Invoice Delete',
						value: 'invoice_delete',
						description: 'Triggered when an invoice is deleted',
					},
                    {
						name: 'Invoice Void',
						value: 'invoice_void',
						description: 'Triggered when an invoice is void',
					},
                    {
						name: 'Invoice Create',
						value: 'invoice_create',
						description: 'Triggered when an invoice is created',
					},
					{
						name: 'Payment Emailed',
						value: 'payment_emailed',
						description: 'Triggered when an payment is emailed',
					},
					{
						name: 'Payment Update',
						value: 'payment_update',
						description: 'Triggered when an payment is updated',
					},
                    {
						name: 'Payment Delete',
						value: 'payment_delete',
						description: 'Triggered when an payment is deleted',
					},
                    {
						name: 'Payment Void',
						value: 'payment_void',
						description: 'Triggered when an payment is updated',
					},
                    {
						name: 'Payment Create',
						value: 'payment_create',
						description: 'Triggered when an payment is created',
					},
                    {
						name: 'Account Update',
						value: 'account_update',
						description: 'Triggered when an account is updated',
					},
                    {
						name: 'Account Delete',
						value: 'account_delete',
						description: 'Triggered when an account is deleted',
					},
                    {
						name: 'Account Merge',
						value: 'account_merge',
						description: 'Triggered when an account is merged',
					},
                    {
						name: 'Account Create',
						value: 'account_create',
						description: 'Triggered when an account is created',
					},
                    {
						name: 'Bill Payment Update',
						value: 'bill_payment_update',
						description: 'Triggered when an bill payment is updated',
					},
                    {
						name: 'Bill Payment Delete',
						value: 'bill_payment_delete',
						description: 'Triggered when an bill payment is deleted',
					},
                    {
						name: 'Bill Payment Void',
						value: 'bill_payment_void',
						description: 'Triggered when an bill payment is void',
					},
                    {
						name: 'Bill Payment Create',
						value: 'bill_payment_create',
						description: 'Triggered when an bill payment is created',
					},
                    {
						name: 'Class Update',
						value: 'class_update',
						description: 'Triggered when an class is updated',
					},
                    {
						name: 'Class Delete',
						value: 'class_delete',
						description: 'Triggered when an class is deleted',
					},
                    {
						name: 'Class Merge',
						value: 'class_merge',
						description: 'Triggered when an class is merged',
					},
                    {
						name: 'Class Create',
						value: 'class_create',
						description: 'Triggered when an class is created',
					},
                    {
						name: 'Customer Update',
						value: 'customer_update',
						description: 'Triggered when an customer is updated',
					},
                    {
						name: 'Customer Delete',
						value: 'customer_delete',
						description: 'Triggered when an customer is deleted',
					},
                    {
						name: 'Customer Merge',
						value: 'customer_merge',
						description: 'Triggered when an customer is merged',
					},
                    {
						name: 'Customer Create',
						value: 'customer_create',
						description: 'Triggered when an customer is created',
					},
                    {
						name: 'Employee Update',
						value: 'employee_update',
						description: 'Triggered when an employee is updated',
					},
                    {
						name: 'Employee Delete',
						value: 'employee_delete',
						description: 'Triggered when an employee is deleted',
					},
                    {
						name: 'Employee Merge',
						value: 'employee_merge',
						description: 'Triggered when an employee is merged',
					},
                    {
						name: 'Employee Create',
						value: 'employee_create',
						description: 'Triggered when an employee is created',
					},
                    {
						name: 'Estimate Update',
						value: 'estimate_update',
						description: 'Triggered when an estimate is updated',
					},
                    {
						name: 'Estimate Delete',
						value: 'estimate_delete',
						description: 'Triggered when an estimate is deleted',
					},
                    {
						name: 'Estimate Emailed',
						value: 'estimate_emailed',
						description: 'Triggered when an estimate is emailed',
					},
                    {
						name: 'Estimate Create',
						value: 'estimate_create',
						description: 'Triggered when an estimate is created',
					},
                    {
						name: 'Item Update',
						value: 'item_update',
						description: 'Triggered when an item is updated',
					},
                    {
						name: 'Item Delete',
						value: 'item_delete',
						description: 'Triggered when an item is deleted',
					},
                    {
						name: 'Item Merge',
						value: 'class_merge',
						description: 'Triggered when an item is merged',
					},
                    {
						name: 'Item Create',
						value: 'item_create',
						description: 'Triggered when an item is created',
					},
                    {
						name: 'Purchase Update',
						value: 'purchase_update',
						description: 'Triggered when an purchase is updated',
					},
                    {
						name: 'Purchase Delete',
						value: 'purchase_delete',
						description: 'Triggered when an purchase is deleted',
					},
                    {
						name: 'Purchase Void',
						value: 'purchase_void',
						description: 'Triggered when an purchase is void',
					},
                    {
						name: 'Purchase Create',
						value: 'purchase_create',
						description: 'Triggered when an purchase is created',
					},
                    {
						name: 'SalesReceipt Emailed',
						value: 'sales_receipt_emailed',
						description: 'Triggered when an sales receipt is emailed',
					},
					{
						name: 'SalesReceipt Update',
						value: 'sales_receipt_update',
						description: 'Triggered when an sales receipt is updated',
					},
                    {
						name: 'SalesReceipt Delete',
						value: 'sales_receipt_delete',
						description: 'Triggered when an sales receipt is deleted',
					},
                    {
						name: 'SalesReceipt Void',
						value: 'sales_receipt_void',
						description: 'Triggered when an sales receipt is void',
					},
                    {
						name: 'SalesReceipt Create',
						value: 'sales_receipt_create',
						description: 'Triggered when an sales receipt is created',
					},
                    {
						name: 'Vendor Update',
						value: 'vendor_update',
						description: 'Triggered when an vendor is updated',
					},
                    {
						name: 'Vendor Delete',
						value: 'vendor_delete',
						description: 'Triggered when an vendor is deleted',
					},
                    {
						name: 'Vendor Merge',
						value: 'vendor_merge',
						description: 'Triggered when an vendor is merged',
					},
                    {
						name: 'Vendor Create',
						value: 'vendor_create',
						description: 'Triggered when an vendor is created',
					},
                    {
						name: 'Bill Update',
						value: 'bill_update',
						description: 'Triggered when an bill is updated',
					},
                    {
						name: 'Bill Delete',
						value: 'bill_delete',
						description: 'Triggered when an bill is deleted',
					},
                    {
						name: 'Bill Create',
						value: 'bill_create',
						description: 'Triggered when an bill is created',
					},
					{
						name: 'Credit Memo Emailed',
						value: 'credit_memo_emailed',
						description: 'Triggered when an credit memo is emailed',
					},
					{
						name: 'Credit Memo Update',
						value: 'credit_memo_update',
						description: 'Triggered when an credit memo is updated',
					},
                    {
						name: 'Credit Memo Delete',
						value: 'credit_memo_delete',
						description: 'Triggered when an credit memo is deleted',
					},
                    {
						name: 'Credit Memo Void',
						value: 'credit_memo_void',
						description: 'Triggered when an credit memo is void',
					},
                    {
						name: 'Credit Memo Create',
						value: 'credit_memo_create',
						description: 'Triggered when an credit memo is created',
					},
					{
						name: 'Refund Receipt Emailed',
						value: 'refund_receipt_emailed',
						description: 'Triggered when an refund receipt is emailed',
					},
					{
						name: 'Refund Receipt Update',
						value: 'refund_receipt_update',
						description: 'Triggered when an refund receipt is updated',
					},
                    {
						name: 'Refund Receipt Delete',
						value: 'refund_receipt_delete',
						description: 'Triggered when an refund receipt is deleted',
					},
                    {
						name: 'Refund Receipt Void',
						value: 'refund_receipt_void',
						description: 'Triggered when an refund receipt is void',
					},
                    {
						name: 'Refund Receipt Create',
						value: 'refund_receipt_create',
						description: 'Triggered when an refund receipt is created',
					},
					{
						name: 'Vendor Credit Update',
						value: 'vendor_credit_update',
						description: 'Triggered when an vendor credit is updated',
					},
                    {
						name: 'Vendor Credit Delete',
						value: 'vendor_credit_delete',
						description: 'Triggered when an vendor credit is deleted',
					},
                    {
						name: 'Vendor Credit Create',
						value: 'vendor_credit_create',
						description: 'Triggered when an vendor credit is created',
					},
					{
						name: 'Time Activity Update',
						value: 'time_activity_update',
						description: 'Triggered when an time activity is updated',
					},
                    {
						name: 'Time Activity Delete',
						value: 'time_activity_delete',
						description: 'Triggered when an time activity is deleted',
					},
                    {
						name: 'Time Activity Create',
						value: 'time_activity_create',
						description: 'Triggered when an time activity is created',
					},
					{
						name: 'Department Update',
						value: 'department_update',
						description: 'Triggered when an department is updated',
					},
					{
						name: 'Department Merge',
						value: 'department_merge',
						description: 'Triggered when an department is merged',
					},
                    {
						name: 'Department Create',
						value: 'department_create',
						description: 'Triggered when an department is created',
					},
					{
						name: 'Deposit Update',
						value: 'deposit_update',
						description: 'Triggered when an deposit is updated',
					},
                    {
						name: 'Deposit Delete',
						value: 'deposit_delete',
						description: 'Triggered when an deposit is deleted',
					},
                    {
						name: 'Deposit Create',
						value: 'deposit_create',
						description: 'Triggered when an deposit is created',
					},
					{
						name: 'Journal Entry Update',
						value: 'journal_entry_update',
						description: 'Triggered when an journal entry is updated',
					},
                    {
						name: 'Journal Entry Delete',
						value: 'journal_entry_delete',
						description: 'Triggered when an journal entry is deleted',
					},
                    {
						name: 'Journal Entry Create',
						value: 'journal_entry_create',
						description: 'Triggered when an journal entry is created',
					},
					{
						name: 'Payment Method Update',
						value: 'payment_method_update',
						description: 'Triggered when an payment method is updated',
					},
					{
						name: 'Payment Method Merge',
						value: 'payment_method_merge',
						description: 'Triggered when an payment method is merged',
					},
                    {
						name: 'Payment Method Create',
						value: 'payment_method_create',
						description: 'Triggered when an payment method is created',
					},
					{
						name: 'Preferences Update',
						value: 'preferences_update',
						description: 'Triggered when an preferences is updated',
					},
					{
						name: 'Purchase Order Emailed',
						value: 'purchase_order_emailed',
						description: 'Triggered when an purchase order is emailed',
					},
					{
						name: 'Purchase Order Update',
						value: 'purchase_order_update',
						description: 'Triggered when an purchase order is updated',
					},
                    {
						name: 'Purchase Order Delete',
						value: 'purchase_order_delete',
						description: 'Triggered when an purchase order is deleted',
					},
                    {
						name: 'Purchase Order Create',
						value: 'purchase_order_create',
						description: 'Triggered when an purchase order is created',
					},
					{
						name: 'Tax Agency Update',
						value: 'tax_agency_update',
						description: 'Triggered when an tax agency is updated',
					},
                    {
						name: 'Tax Agency Create',
						value: 'tax_agency_create',
						description: 'Triggered when an tax agency is created',
					},
					{
						name: 'Term Update',
						value: 'term_update',
						description: 'Triggered when an term is updated',
					},
                    {
						name: 'Term Create',
						value: 'term_create',
						description: 'Triggered when an term is created',
					},
					{
						name: 'Budget Update',
						value: 'budget_update',
						description: 'Triggered when an budget is updated',
					},
                    {
						name: 'Budget Create',
						value: 'budget_create',
						description: 'Triggered when an budget is created',
					},
					{
						name: 'Currency Update',
						value: 'currency_update',
						description: 'Triggered when an currency is updated',
					},
                    {
						name: 'Currency Create',
						value: 'currency_create',
						description: 'Triggered when an currency is created',
					},
					{
						name: 'Journal Code Update',
						value: 'journal_code_update',
						description: 'Triggered when an journal code is updated',
					},
                    {
						name: 'Journal Code Create',
						value: 'journal_code_create',
						description: 'Triggered when an journal code is created',
					},
					{
						name: 'Transfer Update',
						value: 'transfer_update',
						description: 'Triggered when an transfer is updated',
					},
                    {
						name: 'Transfer Delete',
						value: 'transfer_delete',
						description: 'Triggered when an transfer is deleted',
					},
                    {
						name: 'Transfer Void',
						value: 'transfer_void',
						description: 'Triggered when an transfer is void',
					},
                    {
						name: 'Transfer Create',
						value: 'transfer_create',
						description: 'Triggered when an transfer is created',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const req = this.getRequestObject();

		const events = this.getNodeParameter('events', []) as string[];

		const eventType = bodyData.event_type as string | undefined;

		if (eventType === undefined || (!events.includes('*') && !events.includes(eventType))) {
			// If not eventType is defined or when one is defined but we are not
			// listening to it do not start the workflow.
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
		};
	}
}
