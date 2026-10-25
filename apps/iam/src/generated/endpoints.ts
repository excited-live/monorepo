/**
 * GENERATED — do not edit.
 *
 * Source: apps/api/openapi.json (26 paths).
 * Regenerate: pnpm --filter @excited-live/iam gen:catalog
 * (apps/api's `gen:openapi` runs this automatically.)
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface EndpointField {
	name: string
	type: string
	required: boolean
	description: string
	enum?: string[]
	min?: number
	max?: number
	format?: string
}

export interface EndpointParam {
	name: string
	in: string
	required: boolean
	type: string
	description: string
}

export interface Endpoint {
	id: string
	method: HttpMethod
	path: string
	summary: string
	description: string
	tag: string
	params: EndpointParam[]
	body: { fields: EndpointField[]; draft: Record<string, unknown> | null } | null
	response: string | null
	status: string
}

export const API_TITLE = "excited.live API"
export const API_VERSION = "0.0.1"
export const ENDPOINTS: readonly Endpoint[] = [
	{
		"id": "get-health",
		"method": "GET",
		"path": "/health",
		"summary": "Health check",
		"description": "",
		"tag": "System",
		"params": [],
		"body": null,
		"response": "object",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-entities",
		"method": "GET",
		"path": "/api/v1/accounting/entities",
		"summary": "List entities",
		"description": "Bootstraps the personal entity and its default wallet on first call.",
		"tag": "Accounting",
		"params": [],
		"body": null,
		"response": "array<Entity>",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-entities",
		"method": "POST",
		"path": "/api/v1/accounting/entities",
		"summary": "Create a business entity",
		"description": "Business only. Also creates its default cash asset, \"<name> Main Wallet\", at ฿0.",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "id",
					"type": "string",
					"required": false,
					"description": "",
					"format": "uuid"
				},
				{
					"name": "type",
					"type": "\"personal\" | \"business\"",
					"required": false,
					"description": "Only `business` can be created; the personal entity is created on first use.",
					"enum": [
						"personal",
						"business"
					]
				},
				{
					"name": "asOf",
					"type": "string",
					"required": false,
					"description": "Client's current month or day. Default month for startMonth; otherwise the UTC month."
				},
				{
					"name": "name",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "currency",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "targetSafetyBuffer",
					"type": "number",
					"required": false,
					"description": "",
					"min": 0
				},
				{
					"name": "active",
					"type": "boolean",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"name": ""
			}
		},
		"response": "Entity",
		"status": "201"
	},
	{
		"id": "get-api-v1-accounting-entities-id",
		"method": "GET",
		"path": "/api/v1/accounting/entities/{id}",
		"summary": "Get an entity",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Entity",
		"status": "200"
	},
	{
		"id": "patch-api-v1-accounting-entities-id",
		"method": "PATCH",
		"path": "/api/v1/accounting/entities/{id}",
		"summary": "Update an entity",
		"description": "Partial update. The entity type cannot change.",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": {
			"fields": [
				{
					"name": "version",
					"type": "integer",
					"required": false,
					"description": "Stored version the caller last read; a mismatch returns 409.",
					"min": 1,
					"max": 9007199254740991
				},
				{
					"name": "type",
					"type": "\"personal\" | \"business\"",
					"required": false,
					"description": "Must match the stored type; entity type cannot change.",
					"enum": [
						"personal",
						"business"
					]
				},
				{
					"name": "name",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "currency",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "targetSafetyBuffer",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean | null",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string | null",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"version": 1
			}
		},
		"response": "Entity",
		"status": "200"
	},
	{
		"id": "delete-api-v1-accounting-entities-id",
		"method": "DELETE",
		"path": "/api/v1/accounting/entities/{id}",
		"summary": "Delete a business entity",
		"description": "The personal entity cannot be deleted. Deleting cascades to all of its records.",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-assets",
		"method": "GET",
		"path": "/api/v1/accounting/assets",
		"summary": "List assets",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": ""
			},
			{
				"name": "kind",
				"in": "query",
				"required": false,
				"type": "\"cash\" | \"fixed\" | \"investment\"",
				"description": ""
			}
		],
		"body": null,
		"response": "array<Asset>",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-assets",
		"method": "POST",
		"path": "/api/v1/accounting/assets",
		"summary": "Create an asset",
		"description": "Body discriminated by `kind`. Fixed and investment assets accept `paidFrom` (creates the purchase transfer in the same write); fixed assets accept `financing` (creates a loan liability, paid at its level payment unless `amount` is given). A cash asset with `isDefault` clears the entity's other defaults; an entity's first cash asset is always the default.",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "id",
					"type": "string",
					"required": false,
					"description": "",
					"format": "uuid"
				},
				{
					"name": "entityId",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "name",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "object",
					"required": false,
					"description": ""
				},
				{
					"name": "kind",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "balance",
					"type": "number",
					"required": false,
					"description": "Defaults to 0."
				},
				{
					"name": "balanceAsOf",
					"type": "string",
					"required": false,
					"description": "Defaults to the UTC month."
				},
				{
					"name": "currency",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "isDefault",
					"type": "boolean",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"entityId": "",
				"name": "",
				"category": "",
				"kind": ""
			}
		},
		"response": "Asset",
		"status": "201"
	},
	{
		"id": "get-api-v1-accounting-assets-id",
		"method": "GET",
		"path": "/api/v1/accounting/assets/{id}",
		"summary": "Get an asset",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Asset",
		"status": "200"
	},
	{
		"id": "patch-api-v1-accounting-assets-id",
		"method": "PATCH",
		"path": "/api/v1/accounting/assets/{id}",
		"summary": "Update an asset",
		"description": "Partial update. `kind` and `entityId` cannot change.",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": {
			"fields": [
				{
					"name": "version",
					"type": "integer",
					"required": false,
					"description": "Stored version the caller last read; a mismatch returns 409.",
					"min": 1,
					"max": 9007199254740991
				},
				{
					"name": "name",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean | null",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "balance",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "balanceAsOf",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "currency",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "isDefault",
					"type": "boolean | null",
					"required": false,
					"description": ""
				},
				{
					"name": "cost",
					"type": "number",
					"required": false,
					"description": "",
					"min": 0
				},
				{
					"name": "acquiredOn",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "depreciationMethod",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "usefulLifeMonths",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "salvageValue",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "instrument",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "symbol",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "units",
					"type": "number | null",
					"required": false,
					"description": ""
				},
				{
					"name": "costBasis",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "marketValue",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "valuedAsOf",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "expectedAnnualReturn",
					"type": "number | null",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"version": 1
			}
		},
		"response": "Asset",
		"status": "200"
	},
	{
		"id": "delete-api-v1-accounting-assets-id",
		"method": "DELETE",
		"path": "/api/v1/accounting/assets/{id}",
		"summary": "Delete an asset",
		"description": "Deleting the default cash asset promotes the oldest remaining cash asset of the entity.",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-incomes",
		"method": "GET",
		"path": "/api/v1/accounting/incomes",
		"summary": "List incomes",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": ""
			},
			{
				"name": "kind",
				"in": "query",
				"required": false,
				"type": "\"employment\" | \"business\" | \"investment\" | \"other\"",
				"description": ""
			}
		],
		"body": null,
		"response": "array<Income>",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-incomes",
		"method": "POST",
		"path": "/api/v1/accounting/incomes",
		"summary": "Create an income",
		"description": "`employment` only for kind employment; `sourceAssetId` only for kind investment.",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "id",
					"type": "string",
					"required": false,
					"description": "",
					"format": "uuid"
				},
				{
					"name": "entityId",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "asOf",
					"type": "string",
					"required": false,
					"description": "Client's current month or day. Default month for startMonth; otherwise the UTC month."
				},
				{
					"name": "name",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "amount",
					"type": "number",
					"required": true,
					"description": "",
					"min": 0
				},
				{
					"name": "cycle",
					"type": "\"weekly\" | \"monthly\" | \"quarterly\" | \"semi-annual\" | \"yearly\" | \"one_time\"",
					"required": false,
					"description": "",
					"enum": [
						"weekly",
						"monthly",
						"quarterly",
						"semi-annual",
						"yearly",
						"one_time"
					]
				},
				{
					"name": "dayOfMonth",
					"type": "integer",
					"required": false,
					"description": "",
					"min": 1,
					"max": 31
				},
				{
					"name": "startMonth",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "endMonth",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "taxCategory",
					"type": "\"40_1\" | \"40_2\" | \"40_3\" | \"40_4\" | \"40_5\" | \"40_6\" | \"40_7\" | \"40_8\"",
					"required": false,
					"description": "",
					"enum": [
						"40_1",
						"40_2",
						"40_3",
						"40_4",
						"40_5",
						"40_6",
						"40_7",
						"40_8"
					]
				},
				{
					"name": "depositAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "object",
					"required": false,
					"description": ""
				},
				{
					"name": "kind",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "employment",
					"type": "object",
					"required": false,
					"description": ""
				},
				{
					"name": "sourceAssetId",
					"type": "any",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"entityId": "",
				"name": "",
				"category": "",
				"amount": 0,
				"kind": ""
			}
		},
		"response": "Income",
		"status": "201"
	},
	{
		"id": "get-api-v1-accounting-incomes-id",
		"method": "GET",
		"path": "/api/v1/accounting/incomes/{id}",
		"summary": "Get an income",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Income",
		"status": "200"
	},
	{
		"id": "patch-api-v1-accounting-incomes-id",
		"method": "PATCH",
		"path": "/api/v1/accounting/incomes/{id}",
		"summary": "Update an income",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": {
			"fields": [
				{
					"name": "version",
					"type": "integer",
					"required": false,
					"description": "Stored version the caller last read; a mismatch returns 409.",
					"min": 1,
					"max": 9007199254740991
				},
				{
					"name": "name",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "amount",
					"type": "number",
					"required": false,
					"description": "",
					"min": 0
				},
				{
					"name": "cycle",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "dayOfMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "startMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "endMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "taxCategory",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "depositAssetId",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean | null",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "employment",
					"type": "object",
					"required": false,
					"description": ""
				},
				{
					"name": "sourceAssetId",
					"type": "string",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"version": 1
			}
		},
		"response": "Income",
		"status": "200"
	},
	{
		"id": "delete-api-v1-accounting-incomes-id",
		"method": "DELETE",
		"path": "/api/v1/accounting/incomes/{id}",
		"summary": "Delete an income",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-incomes-career",
		"method": "POST",
		"path": "/api/v1/accounting/incomes/career",
		"summary": "Set the career salary",
		"description": "Updates the entity's primary employment income (earliest startMonth), or creates one when `salary > 0`. A salary of 0 deactivates the primary income.",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "entityId",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "salary",
					"type": "number",
					"required": true,
					"description": "",
					"min": 0
				},
				{
					"name": "paydayDayOfMonth",
					"type": "integer",
					"required": false,
					"description": "",
					"min": 1,
					"max": 31
				},
				{
					"name": "title",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "company",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "startMonth",
					"type": "any",
					"required": false,
					"description": "`YYYY-MM`. Empty string keeps the existing start month."
				},
				{
					"name": "endMonth",
					"type": "any",
					"required": false,
					"description": "`YYYY-MM`. Empty string clears the end month."
				},
				{
					"name": "asOf",
					"type": "string",
					"required": false,
					"description": "Client's current month or day. Default month for startMonth; otherwise the UTC month."
				}
			],
			"draft": {
				"entityId": "",
				"salary": 0
			}
		},
		"response": "object",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-expenses",
		"method": "GET",
		"path": "/api/v1/accounting/expenses",
		"summary": "List expenses",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "array<Expense>",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-expenses",
		"method": "POST",
		"path": "/api/v1/accounting/expenses",
		"summary": "Create an expense",
		"description": "",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "id",
					"type": "string",
					"required": false,
					"description": "",
					"format": "uuid"
				},
				{
					"name": "entityId",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "asOf",
					"type": "string",
					"required": false,
					"description": "Client's current month or day. Default month for startMonth; otherwise the UTC month."
				},
				{
					"name": "name",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "amount",
					"type": "number",
					"required": true,
					"description": "",
					"min": 0
				},
				{
					"name": "cycle",
					"type": "\"weekly\" | \"monthly\" | \"quarterly\" | \"semi-annual\" | \"yearly\" | \"one_time\"",
					"required": false,
					"description": "",
					"enum": [
						"weekly",
						"monthly",
						"quarterly",
						"semi-annual",
						"yearly",
						"one_time"
					]
				},
				{
					"name": "dayOfMonth",
					"type": "integer",
					"required": false,
					"description": "",
					"min": 1,
					"max": 31
				},
				{
					"name": "startMonth",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "endMonth",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "paidFromAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "paidFromLiabilityId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "assetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "incomeId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "object",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"entityId": "",
				"name": "",
				"category": "",
				"amount": 0
			}
		},
		"response": "Expense",
		"status": "201"
	},
	{
		"id": "get-api-v1-accounting-expenses-id",
		"method": "GET",
		"path": "/api/v1/accounting/expenses/{id}",
		"summary": "Get an expense",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Expense",
		"status": "200"
	},
	{
		"id": "patch-api-v1-accounting-expenses-id",
		"method": "PATCH",
		"path": "/api/v1/accounting/expenses/{id}",
		"summary": "Update an expense",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": {
			"fields": [
				{
					"name": "version",
					"type": "integer",
					"required": false,
					"description": "Stored version the caller last read; a mismatch returns 409.",
					"min": 1,
					"max": 9007199254740991
				},
				{
					"name": "name",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "amount",
					"type": "number",
					"required": false,
					"description": "",
					"min": 0
				},
				{
					"name": "cycle",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "dayOfMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "startMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "endMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "paidFromAssetId",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "paidFromLiabilityId",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "assetId",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "incomeId",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean | null",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "any",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"version": 1
			}
		},
		"response": "Expense",
		"status": "200"
	},
	{
		"id": "delete-api-v1-accounting-expenses-id",
		"method": "DELETE",
		"path": "/api/v1/accounting/expenses/{id}",
		"summary": "Delete an expense",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-liabilities",
		"method": "GET",
		"path": "/api/v1/accounting/liabilities",
		"summary": "List liabilities",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": ""
			},
			{
				"name": "kind",
				"in": "query",
				"required": false,
				"type": "\"loan\" | \"revolving\" | \"other\"",
				"description": ""
			}
		],
		"body": null,
		"response": "array<Liability>",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-liabilities",
		"method": "POST",
		"path": "/api/v1/accounting/liabilities",
		"summary": "Create a liability",
		"description": "Body discriminated by `kind`. A loan without `amount` is paid at its level payment, calculateLoanPayment(principal, annualRate, termMonths), and its payments start in the origination month unless `startMonth` is given.",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "id",
					"type": "string",
					"required": false,
					"description": "",
					"format": "uuid"
				},
				{
					"name": "entityId",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "asOf",
					"type": "string",
					"required": false,
					"description": "Client's current month or day. Default month for startMonth; otherwise the UTC month."
				},
				{
					"name": "name",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "cycle",
					"type": "\"weekly\" | \"monthly\" | \"quarterly\" | \"semi-annual\" | \"yearly\" | \"one_time\"",
					"required": false,
					"description": "",
					"enum": [
						"weekly",
						"monthly",
						"quarterly",
						"semi-annual",
						"yearly",
						"one_time"
					]
				},
				{
					"name": "dayOfMonth",
					"type": "integer",
					"required": false,
					"description": "",
					"min": 1,
					"max": 31
				},
				{
					"name": "startMonth",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "endMonth",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "paidFromAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "object",
					"required": false,
					"description": ""
				},
				{
					"name": "kind",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "amount",
					"type": "number",
					"required": false,
					"description": "Monthly payment. Defaults to the level payment: calculateLoanPayment(principal, annualRate, termMonths).",
					"min": 0
				},
				{
					"name": "loan",
					"type": "object",
					"required": true,
					"description": ""
				},
				{
					"name": "revolving",
					"type": "any",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"entityId": "",
				"name": "",
				"category": "",
				"kind": "",
				"loan": {}
			}
		},
		"response": "Liability",
		"status": "201"
	},
	{
		"id": "get-api-v1-accounting-liabilities-id",
		"method": "GET",
		"path": "/api/v1/accounting/liabilities/{id}",
		"summary": "Get a liability",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Liability",
		"status": "200"
	},
	{
		"id": "patch-api-v1-accounting-liabilities-id",
		"method": "PATCH",
		"path": "/api/v1/accounting/liabilities/{id}",
		"summary": "Update a liability",
		"description": "Partial update. `loan` and `revolving` merge shallowly onto the stored details.",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": {
			"fields": [
				{
					"name": "version",
					"type": "integer",
					"required": false,
					"description": "Stored version the caller last read; a mismatch returns 409.",
					"min": 1,
					"max": 9007199254740991
				},
				{
					"name": "name",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "category",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "cycle",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "dayOfMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "startMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "endMonth",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "paidFromAssetId",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "active",
					"type": "boolean | null",
					"required": false,
					"description": ""
				},
				{
					"name": "notes",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "imageUrl",
					"type": "string | null",
					"required": false,
					"description": ""
				},
				{
					"name": "details",
					"type": "any",
					"required": false,
					"description": ""
				},
				{
					"name": "amount",
					"type": "number",
					"required": false,
					"description": "",
					"min": 0
				},
				{
					"name": "loan",
					"type": "object",
					"required": false,
					"description": "Merged shallowly onto the stored loan details."
				},
				{
					"name": "revolving",
					"type": "object",
					"required": false,
					"description": "Merged shallowly onto the stored revolving details."
				}
			],
			"draft": {
				"version": 1
			}
		},
		"response": "Liability",
		"status": "200"
	},
	{
		"id": "delete-api-v1-accounting-liabilities-id",
		"method": "DELETE",
		"path": "/api/v1/accounting/liabilities/{id}",
		"summary": "Delete a liability",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-liabilities-id-schedule",
		"method": "GET",
		"path": "/api/v1/accounting/liabilities/{id}/schedule",
		"summary": "Get a liability's month-by-month schedule",
		"description": "Loans: payments, interest and principal per month, including extra-payment transfers. Revolving: opening balance, interest, card charges and payments per month. Liabilities of kind `other` have no schedule (400).",
		"tag": "Accounting",
		"params": [
			{
				"name": "through",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Last month `YYYY-MM`. Loans default to the payoff month or the end of the term, whichever comes first (capped at 600 months). Revolving balances default to the current UTC month."
			},
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "any",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-transfers",
		"method": "GET",
		"path": "/api/v1/accounting/transfers",
		"summary": "List transfers",
		"description": "",
		"tag": "Accounting",
		"params": [],
		"body": null,
		"response": "array<Transfer>",
		"status": "200"
	},
	{
		"id": "post-api-v1-accounting-transfers",
		"method": "POST",
		"path": "/api/v1/accounting/transfers",
		"summary": "Create a transfer",
		"description": "Source: `fromAssetId` or `fromEntityId` (its default cash asset). Destination: exactly one of `toAssetId`, `toEntityId` (its default cash asset) or `toLiabilityId`.",
		"tag": "Accounting",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "id",
					"type": "string",
					"required": false,
					"description": "",
					"format": "uuid"
				},
				{
					"name": "amount",
					"type": "number",
					"required": true,
					"description": "",
					"min": 0
				},
				{
					"name": "date",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "cycle",
					"type": "\"one_time\" | \"monthly\"",
					"required": false,
					"description": "",
					"enum": [
						"one_time",
						"monthly"
					]
				},
				{
					"name": "note",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "fromAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "fromEntityId",
					"type": "string",
					"required": false,
					"description": "Resolves to the entity's default cash asset."
				},
				{
					"name": "toAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "toEntityId",
					"type": "string",
					"required": false,
					"description": "Resolves to the entity's default cash asset."
				},
				{
					"name": "toLiabilityId",
					"type": "string",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"amount": 0,
				"date": ""
			}
		},
		"response": "Transfer",
		"status": "201"
	},
	{
		"id": "get-api-v1-accounting-transfers-id",
		"method": "GET",
		"path": "/api/v1/accounting/transfers/{id}",
		"summary": "Get a transfer",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Transfer",
		"status": "200"
	},
	{
		"id": "patch-api-v1-accounting-transfers-id",
		"method": "PATCH",
		"path": "/api/v1/accounting/transfers/{id}",
		"summary": "Update a transfer",
		"description": "Partial update. Name a new source or destination to re-resolve that side.",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": {
			"fields": [
				{
					"name": "version",
					"type": "integer",
					"required": false,
					"description": "Stored version the caller last read; a mismatch returns 409.",
					"min": 1,
					"max": 9007199254740991
				},
				{
					"name": "amount",
					"type": "number",
					"required": false,
					"description": "",
					"min": 0
				},
				{
					"name": "date",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "cycle",
					"type": "\"one_time\" | \"monthly\"",
					"required": false,
					"description": "",
					"enum": [
						"one_time",
						"monthly"
					]
				},
				{
					"name": "note",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "fromAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "fromEntityId",
					"type": "string",
					"required": false,
					"description": "Resolves to the entity's default cash asset."
				},
				{
					"name": "toAssetId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "toEntityId",
					"type": "string",
					"required": false,
					"description": "Resolves to the entity's default cash asset."
				},
				{
					"name": "toLiabilityId",
					"type": "string",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"version": 1
			}
		},
		"response": "Transfer",
		"status": "200"
	},
	{
		"id": "delete-api-v1-accounting-transfers-id",
		"method": "DELETE",
		"path": "/api/v1/accounting/transfers/{id}",
		"summary": "Delete a transfer",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-summary",
		"method": "GET",
		"path": "/api/v1/accounting/summary",
		"summary": "Get wealth metrics and balance sheet per entity and consolidated",
		"description": "Per entity: wealth metrics and balance sheet at `month`. Consolidated: metrics plus the balance sheet summed over all entities.",
		"tag": "Accounting",
		"params": [
			{
				"name": "month",
				"in": "query",
				"required": true,
				"type": "string",
				"description": "`YYYY-MM`."
			},
			{
				"name": "asOf",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Today (`YYYY-MM-DD`); current values are as of this day when inside `month`."
			}
		],
		"body": null,
		"response": "Summary",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-ledger-yearMonth",
		"method": "GET",
		"path": "/api/v1/accounting/ledger/{yearMonth}",
		"summary": "Get computed monthly ledger",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": ""
			},
			{
				"name": "yearMonth",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "MonthlyLedger",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-cash-flows",
		"method": "GET",
		"path": "/api/v1/accounting/cash-flows",
		"summary": "Get the cash-flow feed for a month",
		"description": "Dated money movements of one entity (default: personal) for one month. `direction` filters `items`; `totals` (moneyIn, moneyOut, spending) always cover every item.",
		"tag": "Accounting",
		"params": [
			{
				"name": "month",
				"in": "query",
				"required": true,
				"type": "string",
				"description": "`YYYY-MM`."
			},
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Defaults to the personal entity."
			},
			{
				"name": "direction",
				"in": "query",
				"required": false,
				"type": "\"in\" | \"out\"",
				"description": "Filters `items` only; `totals` always cover every item."
			},
			{
				"name": "includeDepreciation",
				"in": "query",
				"required": false,
				"type": "\"true\" | \"false\"",
				"description": "Adds non-cash depreciation items. Defaults to `false`."
			}
		],
		"body": null,
		"response": "CashFlowsResponse",
		"status": "200"
	},
	{
		"id": "get-api-v1-accounting-projection",
		"method": "GET",
		"path": "/api/v1/accounting/projection",
		"summary": "Get treasury balance per month around a centre month",
		"description": "",
		"tag": "Accounting",
		"params": [
			{
				"name": "entityId",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Defaults to the personal entity."
			},
			{
				"name": "month",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Centre month `YYYY-MM`. Defaults to the UTC month."
			},
			{
				"name": "pastMonths",
				"in": "query",
				"required": false,
				"type": "integer",
				"description": ""
			},
			{
				"name": "futureMonths",
				"in": "query",
				"required": false,
				"type": "integer",
				"description": ""
			},
			{
				"name": "asOf",
				"in": "query",
				"required": false,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Projection",
		"status": "200"
	},
	{
		"id": "get-api-v1-agent-keys",
		"method": "GET",
		"path": "/api/v1/agent-keys",
		"summary": "List agent API keys",
		"description": "Keys owned by the signed-in user. The secret is never returned.",
		"tag": "Auth",
		"params": [],
		"body": null,
		"response": "object",
		"status": "200"
	},
	{
		"id": "post-api-v1-agent-keys",
		"method": "POST",
		"path": "/api/v1/agent-keys",
		"summary": "Mint an agent API key",
		"description": "Creates a 90-day key scoped to onboarding and accounting, owned by the signed-in user. The full key is returned once.",
		"tag": "Auth",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "agentId",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "name",
					"type": "string",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"agentId": ""
			}
		},
		"response": "object",
		"status": "201"
	},
	{
		"id": "delete-api-v1-agent-keys-id",
		"method": "DELETE",
		"path": "/api/v1/agent-keys/{id}",
		"summary": "Revoke an agent API key",
		"description": "Deletes one of the signed-in user's keys. Another user's key is a 404.",
		"tag": "Auth",
		"params": [
			{
				"name": "id",
				"in": "path",
				"required": true,
				"type": "string",
				"description": ""
			}
		],
		"body": null,
		"response": "Ok",
		"status": "200"
	},
	{
		"id": "get-api-v1-auth-me",
		"method": "GET",
		"path": "/api/v1/auth/me",
		"summary": "Current session",
		"description": "Session check for native apps.",
		"tag": "Auth",
		"params": [],
		"body": null,
		"response": "object",
		"status": "200"
	},
	{
		"id": "get-api-v1-catalog-suggest",
		"method": "GET",
		"path": "/api/v1/catalog/suggest",
		"summary": "Search the catalog",
		"description": "",
		"tag": "Catalog",
		"params": [
			{
				"name": "q",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Search text (name, alias or domain)."
			},
			{
				"name": "currency",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Defaults to `THB`."
			},
			{
				"name": "type",
				"in": "query",
				"required": false,
				"type": "\"subscription\" | \"hardware\" | \"career\" | \"revenue\" | \"liability\"",
				"description": ""
			}
		],
		"body": null,
		"response": "object",
		"status": "200"
	},
	{
		"id": "post-api-v1-catalog-resolve",
		"method": "POST",
		"path": "/api/v1/catalog/resolve",
		"summary": "Resolve autofill values",
		"description": "Smart resolver that skips fields the user already touched.",
		"tag": "Catalog",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "query",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "currency",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "type",
					"type": "\"subscription\" | \"hardware\" | \"career\" | \"revenue\" | \"liability\"",
					"required": false,
					"description": "",
					"enum": [
						"subscription",
						"hardware",
						"career",
						"revenue",
						"liability"
					]
				},
				{
					"name": "touchedFields",
					"type": "object",
					"required": false,
					"description": ""
				},
				{
					"name": "currentValues",
					"type": "object",
					"required": false,
					"description": ""
				}
			],
			"draft": {
				"query": ""
			}
		},
		"response": "object",
		"status": "200"
	},
	{
		"id": "get-api-v1-onboarding",
		"method": "GET",
		"path": "/api/v1/onboarding",
		"summary": "Get onboarding state",
		"description": "Returns onboarding progress for the specified app (defaults to biz-mobile).",
		"tag": "Onboarding",
		"params": [
			{
				"name": "app",
				"in": "query",
				"required": false,
				"type": "string",
				"description": "Application ID (e.g. `biz-mobile`, `webapp`). Defaults to `biz-mobile`."
			}
		],
		"body": null,
		"response": "UserOnboarding",
		"status": "200"
	},
	{
		"id": "put-api-v1-onboarding",
		"method": "PUT",
		"path": "/api/v1/onboarding",
		"summary": "Save onboarding state",
		"description": "Updates onboarding progress, steps completed/skipped, and overall completion status.",
		"tag": "Onboarding",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "appId",
					"type": "string",
					"required": false,
					"description": ""
				},
				{
					"name": "isCompleted",
					"type": "boolean",
					"required": false,
					"description": ""
				},
				{
					"name": "done",
					"type": "array<string>",
					"required": false,
					"description": ""
				},
				{
					"name": "skipped",
					"type": "array<string>",
					"required": false,
					"description": ""
				},
				{
					"name": "method",
					"type": "any",
					"required": false,
					"description": "Pass `null` to clear the stored method."
				}
			],
			"draft": {
				"appId": ""
			}
		},
		"response": "object",
		"status": "200"
	},
	{
		"id": "get-api-v1-settings",
		"method": "GET",
		"path": "/api/v1/settings",
		"summary": "Get settings",
		"description": "Defaults (`{ profileName: \"\", gender: \"female\" }`) for a user who never saved.",
		"tag": "Settings",
		"params": [],
		"body": null,
		"response": "UserSettings",
		"status": "200"
	},
	{
		"id": "put-api-v1-settings",
		"method": "PUT",
		"path": "/api/v1/settings",
		"summary": "Save settings",
		"description": "Echoes the request body; reads back normalised to the three stored columns.",
		"tag": "Settings",
		"params": [],
		"body": {
			"fields": [
				{
					"name": "profileName",
					"type": "string",
					"required": true,
					"description": ""
				},
				{
					"name": "birthday",
					"type": "string",
					"required": false,
					"description": "`YYYY-MM-DD`; absent (not null) when unset."
				},
				{
					"name": "gender",
					"type": "string",
					"required": true,
					"description": ""
				}
			],
			"draft": {
				"profileName": "",
				"gender": ""
			}
		},
		"response": "object",
		"status": "200"
	}
] as const

/** Tags in first-seen order, for the Data tab's left rail. */
export const ENDPOINT_TAGS: readonly string[] = [
	...new Set(ENDPOINTS.map((endpoint) => endpoint.tag)),
]
