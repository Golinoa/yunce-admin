import { Modal } from 'ant-design-vue';

/** 高危写操作二次确认；取消时返回 false */
export function confirmAction(options: {
  content?: string;
  okType?: 'danger' | 'primary';
  title: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      cancelText: '取消',
      content: options.content,
      okText: '确认',
      okType: options.okType ?? 'primary',
      onCancel: () => resolve(false),
      onOk: () => resolve(true),
      title: options.title,
    });
  });
}
