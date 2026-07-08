class AppError {
  public readonly message: string;

  public readonly statusCode: number;

  static readonly ERR_TICKET_WITH_PIX_CODE = "Não é possível assinar tickets que contenham códigos PIX";

  constructor(message: string, statusCode = 400) {
    this.message = message;
    this.statusCode = statusCode;
  }
}

export default AppError;
