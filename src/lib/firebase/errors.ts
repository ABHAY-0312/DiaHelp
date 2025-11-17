
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  private static readonly baseMessage = 'FirestoreError: Missing or insufficient permissions: ';

  constructor(context: SecurityRuleContext) {
    // We create a structured JSON string to be parsed by the error overlay.
    const structuredMessage = JSON.stringify(
      {
        message: 'The following request was denied by Firestore Security Rules:',
        context,
      },
      null,
      2
    );

    super(FirestorePermissionError.baseMessage + structuredMessage);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to make the error readable in the browser console.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}

