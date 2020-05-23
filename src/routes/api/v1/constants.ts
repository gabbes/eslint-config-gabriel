export enum Endpoint {
  User = "/api/v1/user",
  UserDelete = "/api/v1/user/delete",
  UserUpdate = "/api/v1/user/update",
}

export enum ErrorCode {
  BasicAuthRequired = "BASIC_AUTH_REQUIRED",
  InvalidBody = "INVALID_BODY",
  JsonWebTokenRequired = "JWT_REQUIRED",
  JsonWebTokenInvalid = "JWT_INVALID",
  UnexpectedError = "UNEXPECTED_ERROR",
  UserEmailInvalidFormat = "USER_EMAIL_INVALID_FORMAT",
  UserEmailTaken = "USER_EMAIL_TAKEN",
  UserNameAndPasswordRequired = "USER_NAME_AND_PASSWORD_REQUIRED",
  UserNameContainsInvalidCharacters = "USER_NAME_CONTAINS_INVALID_CHARACTERS",
  UserNameMaximum18Characters = "USER_NAME_MAXIMUM_18_CHARACTERS",
  UserNameMinimum2Characters = "USER_NAME_MINIMUM_2_CHARACTERS",
  UserNameRequired = "USER_NAME_REQUIRED",
  UserNameTaken = "USER_NAME_TAKEN",
  UserNotFound = "USER_NOT_FOUND",
  UserPasswordMaximum128Characters = "USER_PASSWORD_MAXIMUM_128_CHARACTERS",
  UserPasswordMinimum6Characters = "USER_PASSWORD_MINIMUM_6_CHARACTERS",
  UserPasswordRequired = "USER_PASSWORD_REQUIRED",
}

export const validEmailRegex = /\S+@\S+\.\S+/;
export const validNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
