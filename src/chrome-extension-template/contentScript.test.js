/** @jest-environment jsdom */

const { fireEvent } = require('@testing-library/dom');
const { updateSidebarContent, createSidebar } = require('./contentScript');

describe('feedback interactions', () => {
  let sendMessageMock;

  beforeEach(() => {
    document.body.innerHTML = '';
    sendMessageMock = jest.fn();
    global.chrome = { runtime: { sendMessage: sendMessageMock } };
  });

  const setup = () => {
    const sidebar = document.createElement('div');
    sidebar.className = 'job-ai-sidebar';
    const content = document.createElement('div');
    content.className = 'job-ai-sidebar-content';
    sidebar.appendChild(content);
    document.body.appendChild(sidebar);

    const data = { skills: ['JavaScript'] };
    const jobContext = { title: 'Dev' };
    updateSidebarContent(sidebar, data, null, jobContext);
    return { data, jobContext };
  };

  test('sends rating payload on feedback button click', () => {
    const { data, jobContext } = setup();
    const upButton = document.querySelector('.job-ai-feedback-btn[data-rating="up"]');
    fireEvent.click(upButton);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'USER_FEEDBACK',
      payload: { rating: 'up', job: jobContext, extraction: data }
    });
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  test('sends comment payload and resets textarea after submission', () => {
    const { data, jobContext } = setup();
    const textarea = document.querySelector('.job-ai-feedback-comment');
    textarea.value = 'Nice job';
    const submit = document.querySelector('.job-ai-feedback-submit');
    fireEvent.click(submit);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'USER_FEEDBACK',
      payload: { comment: 'Nice job', job: jobContext, extraction: data }
    });
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe('');
  });
});

describe('auth buttons', () => {
  let sendMessageMock;

  beforeEach(() => {
    document.body.innerHTML = '';
    sendMessageMock = jest.fn();
    global.chrome = { runtime: { sendMessage: sendMessageMock } };
  });

  test('signin button sends AUTH_LOGIN', () => {
    const sidebar = createSidebar();
    const btn = sidebar.querySelector('.job-ai-login');
    fireEvent.click(btn);
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'AUTH_LOGIN' });
  });

  test('signout button sends AUTH_LOGOUT', () => {
    const sidebar = createSidebar();
    const btn = sidebar.querySelector('.job-ai-logout');
    fireEvent.click(btn);
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'AUTH_LOGOUT' });
  });
});

