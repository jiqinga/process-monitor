import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PaginationBar from '../PaginationBar.vue';

// 模拟 vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

describe('PaginationBar', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    visiblePages: [1, 2, 3],
    startIndex: 0,
    endIndex: 10,
    total: 50,
  };

  it('应该正确渲染分页信息', () => {
    const wrapper = mount(PaginationBar, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('dashboard.showing');
    expect(wrapper.text()).toContain('"start":1');
    expect(wrapper.text()).toContain('"end":10');
    expect(wrapper.text()).toContain('"total":50');
  });

  it('应该渲染正确数量的页码按钮', () => {
    const wrapper = mount(PaginationBar, {
      props: defaultProps,
    });

    // 检查可见页码按钮数量（不包括上一页和下一页按钮）
    const pageButtons = wrapper.findAll('button').filter((btn) => {
      const text = btn.text();
      return !isNaN(Number(text)) && text !== '';
    });
    expect(pageButtons).toHaveLength(3);
  });

  it('应该正确显示当前页码', () => {
    const wrapper = mount(PaginationBar, {
      props: defaultProps,
    });

    const currentPageButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === '1';
    });
    expect(currentPageButton?.classes()).toContain('bg-indigo-600');
    expect(currentPageButton?.classes()).toContain('text-white');
  });

  it('应该在第一页时禁用上一页按钮', () => {
    const wrapper = mount(PaginationBar, {
      props: { ...defaultProps, currentPage: 1 },
    });

    const prevButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.prev';
    });
    expect(prevButton?.attributes('disabled')).toBeDefined();
  });

  it('应该在最后一页时禁用下一页按钮', () => {
    const wrapper = mount(PaginationBar, {
      props: { ...defaultProps, currentPage: 5 },
    });

    const nextButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.next';
    });
    expect(nextButton?.attributes('disabled')).toBeDefined();
  });

  it('应该在非第一页时启用上一页按钮', () => {
    const wrapper = mount(PaginationBar, {
      props: { ...defaultProps, currentPage: 2 },
    });

    const prevButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.prev';
    });
    expect(prevButton?.attributes('disabled')).toBeUndefined();
  });

  it('应该在非最后一页时启用下一页按钮', () => {
    const wrapper = mount(PaginationBar, {
      props: { ...defaultProps, currentPage: 4 },
    });

    const nextButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.next';
    });
    expect(nextButton?.attributes('disabled')).toBeUndefined();
  });

  it('应该在点击上一页按钮时触发 prev 事件', async () => {
    const wrapper = mount(PaginationBar, {
      props: { ...defaultProps, currentPage: 2 },
    });

    const prevButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.prev';
    });
    await prevButton?.trigger('click');

    expect(wrapper.emitted('prev')).toHaveLength(1);
  });

  it('应该在点击下一页按钮时触发 next 事件', async () => {
    const wrapper = mount(PaginationBar, {
      props: { ...defaultProps, currentPage: 4 },
    });

    const nextButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.next';
    });
    await nextButton?.trigger('click');

    expect(wrapper.emitted('next')).toHaveLength(1);
  });

  it('应该在点击页码按钮时触发 goTo 事件', async () => {
    const wrapper = mount(PaginationBar, {
      props: defaultProps,
    });

    const page2Button = wrapper.findAll('button').find((btn) => {
      return btn.text() === '2';
    });
    await page2Button?.trigger('click');

    expect(wrapper.emitted('goTo')).toHaveLength(1);
    expect(wrapper.emitted('goTo')?.[0]).toEqual([2]);
  });

  it('应该正确显示不同的页码范围', () => {
    const wrapper = mount(PaginationBar, {
      props: {
        ...defaultProps,
        visiblePages: [4, 5, 6],
      },
    });

    const pageButtons = wrapper.findAll('button').filter((btn) => {
      const text = btn.text();
      return ['4', '5', '6'].includes(text);
    });
    expect(pageButtons).toHaveLength(3);
  });

  it('应该正确处理单页情况', () => {
    const wrapper = mount(PaginationBar, {
      props: {
        ...defaultProps,
        currentPage: 1,
        totalPages: 1,
        visiblePages: [1],
        startIndex: 0,
        endIndex: 10,
        total: 10,
      },
    });

    const prevButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.prev';
    });
    const nextButton = wrapper.findAll('button').find((btn) => {
      return btn.text() === 'dashboard.next';
    });

    expect(prevButton?.attributes('disabled')).toBeDefined();
    expect(nextButton?.attributes('disabled')).toBeDefined();
  });
});
