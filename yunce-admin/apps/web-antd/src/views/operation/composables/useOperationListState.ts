/**
 * 运营列表页共用查询状态（Phase 3 起步壳，后续接 Table/Drawer）。
 */
import { reactive, ref } from 'vue';

export interface OperationListQuery {
  page: number;
  pageSize: number;
  keyword: string;
  status: string;
}

export function createOperationListState(
  initial?: Partial<OperationListQuery>,
) {
  const loading = ref(false);
  const total = ref(0);
  const query = reactive<OperationListQuery>({
    page: initial?.page ?? 1,
    pageSize: initial?.pageSize ?? 20,
    keyword: initial?.keyword ?? '',
    status: initial?.status ?? '',
  });

  function resetPage() {
    query.page = 1;
  }

  function setTotal(n: number) {
    total.value = n;
  }

  return { loading, total, query, resetPage, setTotal };
}
