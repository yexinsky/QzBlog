(async () => {
  // First, list the published posts
  const res = await fetch('http://localhost:3001/api/posts?status=published&limit=10');
  const data = await res.json();
  
  console.log('Posts response (first 500 chars):', JSON.stringify(data, null, 2).slice(0, 500));
  
  // Find a post with valid slug
  const posts = data.posts || data.items || data;
  if (Array.isArray(posts) && posts.length > 0) {
    const slug = posts[0].slug;
    console.log('\nTesting post:', slug);
    
    // Fetch the post page HTML
    const pageRes = await fetch('http://localhost:3001/posts/' + slug);
    const html = await pageRes.text();
    
    // Find PostActions content
    const hasShare = html.includes('分享');
    const hasBookmark = html.includes('收藏');
    const hasLikes = html.includes('赞');
    console.log('Page contains 分享 button:', hasShare);
    console.log('Page contains 收藏 button:', hasBookmark);
    console.log('Page contains 赞 count:', hasLikes);
    
    // Find the like count value
    const likesMatch = html.match(/(\d+)\s*赞/);
    console.log('Like count shown:', likesMatch ? likesMatch[1] : 'not found');
    
    // Check for any onclick or handlers
    const hasOnClick = html.includes('onclick');
    console.log('Has onclick attributes:', hasOnClick);
    
    // Save first 1000 chars for inspection
    fs.writeFileSync('D:/workspace/QzBlog/phase3-evidence/post-page-snippet.html', html.slice(0, 5000));
  } else {
    console.log('No published posts found in API response');
  }
})().catch(e => console.error('Error:', e.message));
