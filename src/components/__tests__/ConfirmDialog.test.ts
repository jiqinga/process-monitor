import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmDialog from '../ConfirmDialog.vue';

describe('ConfirmDialog', () => {
  const defaultProps = {
    visible: true,
    title: '确认',
    message: '确定要执行此操作吗？',
    type: 'info',
    confirmText: '确定',
    cancelText: '取消',
  };

  it('应该正确渲染组件', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    expect(wrapper.find('h3').text()).toBe('确认');
    expect(wrapper.find('p').text()).toBe('确定要执行此操作吗？');
  });

  it('应该显示正确的按钮文本', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toBe('取消');
    expect(buttons[1].text()).toBe('确定');
  });

  it('应该支持自定义标题', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        title: '自定义标题',
      },
    });

    expect(wrapper.find('h3').text()).toBe('自定义标题');
  });

  it('应该支持自定义消息', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        message: '自定义消息内容',
      },
    });

    expect(wrapper.find('p').text()).toBe('自定义消息内容');
  });

  it('应该支持自定义按钮文本', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        confirmText: '确认删除',
        cancelText: '暂不删除',
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toBe('暂不删除');
    expect(buttons[1].text()).toBe('确认删除');
  });

  it('应该在点击确认按钮时触发 confirm 事件', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    const confirmButton = wrapper.findAll('button')[1];
    await confirmButton.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('应该在点击取消按钮时触发 cancel 事件', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    const cancelButton = wrapper.findAll('button')[0];
    await cancelButton.trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('应该在点击确认按钮时更新 visible 属性', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    const confirmButton = wrapper.findAll('button')[1];
    await confirmButton.trigger('click');

    expect(wrapper.emitted('update:visible')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });

  it('应该在点击取消按钮时更新 visible 属性', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    const cancelButton = wrapper.findAll('button')[0];
    await cancelButton.trigger('click');

    expect(wrapper.emitted('update:visible')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });

  it('应该在点击背景时触发取消事件', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    // 点击背景遮罩层
    const backdrop = wrapper.find('.fixed.inset-0.bg-black\\/50');
    await backdrop.trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')).toHaveLength(1);
  });

  it('应该在 visible 为 false 时不渲染内容', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        visible: false,
      },
    });

    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
  });

  it('应该支持 info 类型', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        type: 'info',
      },
    });

    // 检查图标背景颜色
    const iconBg = wrapper.find('.w-10.h-10');
    expect(iconBg.classes()).toContain('bg-indigo-100');

    // 检查确认按钮颜色
    const confirmButton = wrapper.findAll('button')[1];
    expect(confirmButton.classes()).toContain('bg-indigo-500');
  });

  it('应该支持 warning 类型', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        type: 'warning',
      },
    });

    // 检查图标背景颜色
    const iconBg = wrapper.find('.w-10.h-10');
    expect(iconBg.classes()).toContain('bg-amber-100');

    // 检查确认按钮颜色
    const confirmButton = wrapper.findAll('button')[1];
    expect(confirmButton.classes()).toContain('bg-amber-500');
  });

  it('应该支持 danger 类型', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        type: 'danger',
      },
    });

    // 检查图标背景颜色
    const iconBg = wrapper.find('.w-10.h-10');
    expect(iconBg.classes()).toContain('bg-red-100');

    // 检查确认按钮颜色
    const confirmButton = wrapper.findAll('button')[1];
    expect(confirmButton.classes()).toContain('bg-red-500');
  });

  it('应该显示正确的图标', () => {
    // 测试 info 图标
    const infoWrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, type: 'info' },
    });
    expect(infoWrapper.find('svg.text-indigo-500').exists()).toBe(true);

    // 测试 warning 图标
    const warningWrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, type: 'warning' },
    });
    expect(warningWrapper.find('svg.text-amber-500').exists()).toBe(true);

    // 测试 danger 图标
    const dangerWrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, type: 'danger' },
    });
    expect(dangerWrapper.find('svg.text-red-500').exists()).toBe(true);
  });

  it('应该使用默认值', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        visible: true,
      },
    });

    expect(wrapper.find('h3').text()).toBe('确认');
    expect(wrapper.find('p').text()).toBe('确定要执行此操作吗？');

    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toBe('取消');
    expect(buttons[1].text()).toBe('确定');
  });

  it('应该支持多次交互', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
    });

    // 第一次点击确认
    const confirmButton = wrapper.findAll('button')[1];
    await confirmButton.trigger('click');

    // 更新 props 模拟重新打开
    await wrapper.setProps({ visible: true });

    // 第二次点击取消
    const cancelButton = wrapper.findAll('button')[0];
    await cancelButton.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')).toHaveLength(2);
  });

  it('应该正确处理长文本', () => {
    const longTitle = '这是一个非常长的标题，用于测试组件是否能够正确处理长文本内容';
    const longMessage =
      '这是一段非常长的消息内容，用于测试组件是否能够正确处理长文本。它应该能够正确换行显示，而不会破坏布局。';

    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        title: longTitle,
        message: longMessage,
      },
    });

    expect(wrapper.find('h3').text()).toBe(longTitle);
    expect(wrapper.find('p').text()).toBe(longMessage);
  });

  it('应该支持特殊字符', () => {
    const specialTitle = '标题包含特殊字符：@#$%^&*()';
    const specialMessage = '消息包含特殊字符：<script>alert("test")</script>';

    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        title: specialTitle,
        message: specialMessage,
      },
    });

    expect(wrapper.find('h3').text()).toBe(specialTitle);
    expect(wrapper.find('p').text()).toBe(specialMessage);
  });
});
