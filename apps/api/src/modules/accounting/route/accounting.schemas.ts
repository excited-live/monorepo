import { z } from "zod";
import {
	CapitalTransferSchema,
	EntityAccountSchema,
	HardwareAssetSchema,
	LiabilityStreamSchema,
	RecurringSubscriptionSchema,
	RevenueStreamSchema,
	BizSnapshotSchema,
	MonthlyLedgerSchema,
	ErrorSchema,
	OkSchema,
} from "../../../openapi/schemas";

export const CreateAccountSchema = z.object({
	name: z.string().min(1, "Name is required"),
	imageUrl: z.string().optional(),
	id: z.string().optional(),
});

export const UpdateAccountSchema = EntityAccountSchema.partial();

export const CreateExpenseSchema = RecurringSubscriptionSchema.omit({ id: true }).extend({
	id: z.string().optional(),
});

export const UpdateExpenseSchema = RecurringSubscriptionSchema;

export const CreateAssetSchema = HardwareAssetSchema.omit({ id: true }).extend({
	id: z.string().optional(),
});

export const UpdateAssetSchema = HardwareAssetSchema;

export const CreateIncomeSchema = RevenueStreamSchema.omit({ id: true }).extend({
	id: z.string().optional(),
});

export const UpdateIncomeSchema = RevenueStreamSchema;

export const SetCareerIncomeSchema = z.object({
	entityId: z.string(),
	salary: z.number().min(0),
	paydayDayOfMonth: z.number().int().min(1).max(31).optional(),
	title: z.string().optional(),
	company: z.string().optional(),
	imageUrl: z.string().optional(),
	startMonth: z.string().optional(),
	endMonth: z.string().optional(),
});

export const CreateLiabilitySchema = LiabilityStreamSchema.omit({ id: true }).extend({
	id: z.string().optional(),
});

export const UpdateLiabilitySchema = LiabilityStreamSchema;

export const CreateTransferSchema = CapitalTransferSchema.omit({ id: true }).extend({
	id: z.string().optional(),
});

export const ReplaceSnapshotSchema = BizSnapshotSchema.omit({
	updatedAt: true,
	isDefault: true,
}).extend({
	isDefault: z.boolean().optional(),
});

export const GetLedgerQuerySchema = z.object({
	entityId: z.string().optional(),
});

export const OkResponseSchema = OkSchema;

export {
	EntityAccountSchema,
	RecurringSubscriptionSchema,
	HardwareAssetSchema,
	RevenueStreamSchema,
	LiabilityStreamSchema,
	CapitalTransferSchema,
	BizSnapshotSchema,
	MonthlyLedgerSchema,
	ErrorSchema,
	OkSchema,
};

