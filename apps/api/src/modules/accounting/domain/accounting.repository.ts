import type {
	BookAsset,
	BookCashAsset,
	BookEntity,
	BookExpense,
	BookIncome,
	BookLiability,
	BookTransfer,
	Stored,
} from "@excited-live/accounting";

/** One table group per resource (base table + its detail tables). */
export interface ResourceTypes {
	entities: BookEntity;
	assets: BookAsset;
	incomes: BookIncome;
	expenses: BookExpense;
	liabilities: BookLiability;
	transfers: BookTransfer;
}

export type ResourceName = keyof ResourceTypes;

export interface ListFilter {
	/** Records of one entity (ignored for entities and transfers). */
	entityId?: string;
	/** Records of one kind (assets, incomes, liabilities). */
	kind?: string;
}

export type WriteOp = {
	[R in ResourceName]:
		| { op: "insert"; resource: R; record: ResourceTypes[R] }
		| { op: "update"; resource: R; record: ResourceTypes[R]; expectedVersion?: number }
		| { op: "delete"; resource: R; id: string };
}[ResourceName];

export type StoredBook = { [R in ResourceName]: Stored<ResourceTypes[R]>[] };

export interface AccountingRepository {
	/** Every record the user owns, each list in creation order. */
	loadBook(userId: string): Promise<StoredBook>;

	list<R extends ResourceName>(userId: string, resource: R, filter?: ListFilter): Promise<Stored<ResourceTypes[R]>[]>;

	get<R extends ResourceName>(userId: string, resource: R, id: string): Promise<Stored<ResourceTypes[R]> | null>;

	/**
	 * Applies every op in one atomic batch. Inserts start at version 1; updates
	 * replace the whole record (base + detail row) and bump the version; the
	 * record's kind cannot change. Throws NotFoundError when an updated or
	 * deleted id does not exist for the user, VersionConflictError when an
	 * update's expectedVersion differs from the stored one, DuplicateError when
	 * an inserted id already exists, and ValidationError on any other
	 * constraint failure. Returns the stored record of each insert/update op,
	 * in op order (deletes contribute nothing).
	 */
	write(userId: string, ops: WriteOp[]): Promise<Stored<ResourceTypes[ResourceName]>[]>;

	/**
	 * Creates the user's personal entity and its default cash asset unless the
	 * user already has a personal entity. Race-safe: concurrent first requests
	 * create exactly one. Returns the personal entity.
	 */
	ensurePersonalEntity(
		userId: string,
		seed: { entity: BookEntity; wallet: BookCashAsset },
	): Promise<Stored<BookEntity>>;
}
