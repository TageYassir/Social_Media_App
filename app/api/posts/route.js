// File: app/api/posts/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../models';  // ONE level up to app/api/
import { Post, User } from '../models';

// GET all posts
export async function GET(request) {
  console.log('📬 POSTS API GET');
  
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let query = { isPublic: true };
    
    if (userId) query.user = userId;
    if (category) query.category = category;
    
    const skip = (page - 1) * limit;
    
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    console.log(`✅ Found ${posts.length} posts`);
    
    const total = await Post.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      posts: posts || [],
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
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// CREATE a new post
export async function POST(request) {
  console.log('📬 POSTS API POST');
  
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { title, content, description, images, tags, category, userId } = body;
    
    // Validation
    if (!title || !content || !userId) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and userId are required' },
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
    
    // Create post
    const post = new Post({
      title,
      content,
      description: description || '',
      images: images || [],
      tags: tags || [],
      category: category || 'thought',
      user: userId,
      likes: [],
      commentsCount: 0,
      views: 0,
      isPublic: true
    });
    
    await post.save();
    console.log('✅ Post created:', post._id);
    
    // Populate user info
    const populatedPost = await Post.findById(post._id)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    return NextResponse.json(
      {
        success: true,
        post: populatedPost,
        message: 'Post created successfully'
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create post: ' + error.message },
      { status: 500 }
    );
  }
}