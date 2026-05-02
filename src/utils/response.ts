export const success = (
  res: any,
  message: string,
  data: any = null,
  meta: any = null
) => {
  return res.json({
    success: true,
    message,
    data,
    meta
  });
};

export const error = (
  res: any,
  message: string,
  code: number = 400
) => {
  return res.status(code).json({
    success: false,
    message
  });
};