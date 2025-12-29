// File: app/api/posts/comments/[id]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../models';
import { Comment, Post } from '../../../models';

// DELETE a comment
export async function DELETE(request, { params }) {
  const { id } = params;
  
  console.log(`🗑️ DELETE COMMENT API for: ${id}`);
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Comment ID is required' },
      { status: 400 }
    );
  }
  
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find comment
    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the comment
    if (String(comment.user) !== String(userId)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }
    
    // Find the post that contains this comment
    const post = await Post.findById(comment.post);
    if (post) {
      // Remove comment from post's comments array
      post.comments = post.comments.filter(commentId => String(commentId) !== String(id));
      // Decrement comments count
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }
    
    // Delete the comment
    await Comment.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
