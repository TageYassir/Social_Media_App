// File: app/api/posts/[id]/comments/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../models';
import { Comment, Post, User } from '../../../models';
// GET all comments for a specific post
export async function GET(request, { params }) {
  const { id: postId } = await params;
  
  console.log(`📬 COMMENTS API GET for post: ${postId}`);
  
  if (!postId) {
    return NextResponse.json(
      { success: false, error: 'Post ID is required' },
      { status: 400 }
    );
  }
  
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const skip = (page - 1) * limit;
    
    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    console.log(`✅ Found ${comments.length} comments for post ${postId}`);
    
    const total = await Comment.countDocuments({ post: postId });
    
    return NextResponse.json({
      success: true,
      comments: comments || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// CREATE a new comment for a specific post
export async function POST(request, { params }) {
  const { id: postId } = await params;
  
  console.log(`📬 CREATE COMMENT API for post: ${postId}`);
  
  if (!postId) {
    return NextResponse.json(
      { success: false, error: 'Post ID is required' },
      { status: 400 }
    );
  }
  
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { content, userId } = body;
    
    // Validation
    if (!content || !userId) {
      return NextResponse.json(
        { success: false, error: 'Content and userId are required' },
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
    
    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Create comment
    const comment = new Comment({
      content,
      user: userId,
      post: postId,
      likes: []
    });
    
    await comment.save();
    console.log('✅ Comment created:', comment._id);
    
    // Add comment to post's comments array and increment count
    post.comments.push(comment._id);
    post.commentsCount += 1;
    await post.save();
    
    // Populate user info
    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    return NextResponse.json(
      {
        success: true,
        comment: populatedComment,
        message: 'Comment created successfully'
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment: ' + error.message },
      { status: 500 }
    );
  }
}