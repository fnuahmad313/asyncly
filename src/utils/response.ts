import { Response } from "express";

type ResponseData = {
  res: Response;
  statusCode: number;
  success: boolean;
  message: string;
  data?: any;
};

export const sendResponse = ({
  res,
  statusCode,
  success,
  message,
  data,
}: ResponseData) => {
  return res.status(statusCode).json({
    success,
    message,
    ...(data && { data }),
  });
};

export const sendBadRequest = (res: Response, message: string) => {
  return sendResponse({
    res,
    statusCode: 400,
    success: false,
    message,
  });
};

export const sendSuccess = (res: Response, message: string, data?: any) => {
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    message,
    data,
  });
};
