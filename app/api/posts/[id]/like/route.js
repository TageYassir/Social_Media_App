import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../models';
import { Post, User } from '../../../models';

export async function POST(request, { params }) {
  const { id } = await params;
  
  console.log(`❤️ LIKE POST API for: ${id}`);
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Post ID is required' },
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
    
    // Find post
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if user already liked the post
    const alreadyLiked = post.likes.some(likeId => String(likeId) === String(userId));
    
    if (alreadyLiked) {
      // Unlike: remove user from likes array
      post.likes = post.likes.filter(likeId => String(likeId) !== String(userId));
    } else {
      // Like: add user to likes array
      post.likes.push(userId);
    }
    
    await post.save();
    
    const updatedPost = await Post.findById(id)
      .populate('user', 'firstName lastName pseudo email')
      .populate('likes', 'firstName lastName pseudo')
      .lean();
    
    return NextResponse.json({
      success: true,
      post: updatedPost,
      liked: !alreadyLiked,
      likeCount: updatedPost.likes.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to like/unlike post' },
      { status: 500 }
    );
  }
}