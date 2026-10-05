/** Errors carry a message *code*; the human text (en/am) lives in i18n/messages.js */
export class AppError extends Error {
  constructor(code, status = 400, params = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.params = params;
  }
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
