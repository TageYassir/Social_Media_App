// File: app/api/posts/user/[userId]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../models';
import { Post, User } from '../../../models';

export async function GET(request, { params }) {
  const { userId } = await params;
  
  console.log(`📬 USER POSTS API GET for: ${userId}`);
  
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  try {
    await connectToDatabase();
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includePrivate = searchParams.get('includePrivate') === 'true';
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = { user: userId };
    if (!includePrivate) {
      query.isPublic = true;
    }
    
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName pseudo email')
      .lean();
    
    console.log(`✅ Found ${posts.length} posts for user ${userId}`);
    
    const total = await Post.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      posts: posts || [],
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        pseudo: user.pseudo,
        email: user.email
      },
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
      { success: false, posts: [], error: 'Failed to fetch user posts' },
      { status: 500 }
    );
  }
}