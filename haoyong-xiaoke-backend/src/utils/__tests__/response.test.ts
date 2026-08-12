import { success, created, noContent, paginated } from '../response';

const mockJson = jest.fn();
const mockStatus = jest.fn(() => ({ json: mockJson }));
const res = { status: mockStatus };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Response Helpers', () => {
  it('success should return 200 with data', () => {
    success(res, { id: 1 }, 'ok');
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      code: 200,
      data: { id: 1 },
      message: 'ok',
    });
  });

  it('created should return 201', () => {
    created(res, { id: 1 }, 'created');
    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      code: 201,
      data: { id: 1 },
      message: 'created',
    });
  });

  it('noContent should return 200 with null data', () => {
    noContent(res, 'deleted');
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      code: 200,
      data: null,
      message: 'deleted',
    });
  });

  it('paginated should return list with pagination', () => {
    const list = [{ id: 1 }];
    const pagination = { page: 1, pageSize: 10, total: 1, totalPages: 1 };
    paginated(res, list, pagination);
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      code: 200,
      data: { list, pagination },
      message: 'success',
    });
  });
});
