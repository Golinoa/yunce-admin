interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
}

interface ResponseLike {
  status(code: number): {
    json(payload: unknown): unknown;
  };
}

export const success = <T>(res: ResponseLike, data: T, message: string = 'success', code: number = 200) => {
  const response: ApiResponse<T> = {
    code,
    data,
    message,
  };
  return res.status(code).json(response);
};

export const created = <T>(res: ResponseLike, data: T, message: string = '创建成功') => {
  return success(res, data, message, 201);
};

export const noContent = (res: ResponseLike, message: string = '删除成功') => {
  return success(res, null, message, 200);
};

export const paginated = <T>(
  res: ResponseLike,
  list: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  },
  message: string = 'success',
) => {
  return success(res, { list, pagination }, message);
};
