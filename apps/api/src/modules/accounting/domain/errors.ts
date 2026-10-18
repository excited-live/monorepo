export class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly status: number = 400,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class NotFoundError extends DomainError {
	constructor(message = "Resource not found") {
		super(message, "NOT_FOUND", 404);
	}
}

export class VersionConflictError extends DomainError {
	constructor(message = "The record was updated by another request. Please reload.") {
		super(message, "VERSION_CONFLICT", 409);
	}
}

export class ValidationError extends DomainError {
	constructor(message: string) {
		super(message, "VALIDATION_ERROR", 400);
	}
}

export class DuplicateError extends DomainError {
	constructor(message = "A record with this id already exists") {
		super(message, "DUPLICATE", 409);
	}
}
