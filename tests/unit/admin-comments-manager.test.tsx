/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminCommentsManager from '@/components/admin/AdminCommentsManager';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }));

const comment = {
  id: '11111111-1111-4111-8111-111111111111', parentId: null, depth: 0,
  authorName: '测试用户', authorEmail: 'test@example.com', contentMd: '一条待审核评论',
  status: 'pending', isPinned: false, createdAt: '2026-08-27T12:00:00.000Z',
  post: { id: '22222222-2222-4222-8222-222222222222', title: '测试文章', slug: 'test-post' },
};
const listPayload = { comments: [comment], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

describe('AdminCommentsManager', () => {
  beforeEach(() => { (global.fetch as jest.Mock).mockImplementation(() => jsonResponse(listPayload)); });

  test('显示评论作者、文章、状态和操作', async () => {
    render(<AdminCommentsManager />);
    expect(await screen.findByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('测试文章')).toHaveAttribute('href', '/posts/test-post');
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^通过$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^置顶$/ })).toBeDisabled();
  });

  test('通过评论时发送 PATCH 并刷新列表', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => jsonResponse(listPayload))
      .mockImplementationOnce(() => jsonResponse({ comment: { id: comment.id, status: 'approved', isPinned: false } }))
      .mockImplementationOnce(() => jsonResponse({ ...listPayload, comments: [{ ...comment, status: 'approved' }] }));
    render(<AdminCommentsManager />);
    fireEvent.click(await screen.findByRole('button', { name: /^通过$/ }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/admin/comments/${comment.id}`, expect.objectContaining({ method: 'PATCH' })));
    expect(await screen.findByText('评论已通过')).toBeInTheDocument();
  });

  test('取消删除确认时不发送 DELETE', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<AdminCommentsManager />);
    fireEvent.click(await screen.findByRole('button', { name: /删除/ }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('显示加载失败错误', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => jsonResponse({ error: 'Forbidden' }, false));
    render(<AdminCommentsManager />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
  });
});


