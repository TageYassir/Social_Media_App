// File: app/api/posts/[id]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../models';
import { Post, User } from '../../models';

// GET single post
export async function GET(request, { params }) {
  const { id } = await params;
  
  console.log(`📬 SINGLE POST API GET for: ${id}`);
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Post ID is required' },
      { status: 400 }
    );
  }
  
  try {
    await connectToDatabase();
    
    const post = await Post.findById(id)
      .populate('user', 'firstName lastName pseudo email')
      .populate('likes', 'firstName lastName pseudo')
      .lean();
    
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Increment views (non-blocking)
    Post.findByIdAndUpdate(id, { $inc: { views: 1 } }).catch(console.error);
    
    return NextResponse.json({
      success: true,
      post
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// UPDATE post
export async function PUT(request, { params }) {
  const { id } = params;
  
  console.log(`📬 UPDATE POST API for: ${id}`);
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Post ID is required' },
      { status: 400 }
    );
  }
  
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { title, content, description, images, tags, category, isPublic, userId } = body;
    
    // Find post
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the post
    if (String(post.user) !== String(userId)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this post' },
        { status: 403 }
      );
    }
    
    // Update fields
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (description !== undefined) post.description = description;
    if (images !== undefined) post.images = images;
    if (tags !== undefined) post.tags = tags;
    if (category !== undefined) post.category = category;
    if (isPublic !== undefined) post.isPublic = isPublic;
    
    await post.save();
    
    const updatedPost = await Post.findById(id)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE post
export async function DELETE(request, { params }) {
  const { id } = params;
  
  console.log(`📬 DELETE POST API for: ${id}`);
  
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
    
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the post
    if (String(post.user) !== String(userId)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this post' },
        { status: 403 }
      );
    }
    
    await Post.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}