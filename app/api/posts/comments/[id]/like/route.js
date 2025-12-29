// File: app/api/posts/comments/[id]/like/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../models';  // FOUR levels up
import { Comment, User } from '../../../../models';

export async function POST(request, { params }) {
  const { id } = await params;
  
  console.log(`❤️ LIKE COMMENT API for: ${id}`);
  
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
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
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
    
    // Check if user already liked the comment
    const alreadyLiked = comment.likes.some(likeId => String(likeId) === String(userId));
    
    if (alreadyLiked) {
      // Unlike: remove user from likes array
      comment.likes = comment.likes.filter(likeId => String(likeId) !== String(userId));
    } else {
      // Like: add user to likes array
      comment.likes.push(userId);
    }
    
    await comment.save();
    
    const updatedComment = await Comment.findById(id)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    return NextResponse.json({
      success: true,
      comment: updatedComment,
      liked: !alreadyLiked,
      likeCount: updatedComment.likes.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to like/unlike comment' },
      { status: 500 }
    );
  }
}