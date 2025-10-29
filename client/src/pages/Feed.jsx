import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { articlesAPI } from '../api/articles.js';
import { liveNewsAPI } from '../api/liveNewsAPI.js';
import { useAuth } from '../auth/AuthContext.jsx';
import NewsCard from '../components/NewsCard.jsx';
import CategoryTabs from '../components/CategoryTabs.jsx';
import { 
  Filter, 
  Search, 
  Loader2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function Feed() {
  const { saveArticle, unsaveArticle } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [useLiveNews, setUseLiveNews] = useState(true);
  const [liveNewsStatus, setLiveNewsStatus] = useState('online');
  
  const [filters, setFilters] = useState({
    search: '',
    category: searchParams.get('category') || '',
    country: searchParams.get('country') || '',
    tags: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'publishedAt',
    sortOrder: 'desc'
  });

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadArticles = async (reset = false) => {
    if (loading && !reset) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (useLiveNews) {
        await loadLiveNews(reset);
      } else {
        await loadLocalNews(reset);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load articles');
      setLiveNewsStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveNews = async (reset = false) => {
    try {
      // Use 'general' for 'all' category or empty category
      const categoryToUse = !filters.category || filters.category === 'all' ? 'general' : filters.category;
      
      const params = {
        category: categoryToUse,
        query: filters.search,
        limit: 50,
        useCache: true
      };

      const response = await liveNewsAPI.getLiveNews(params);
      
      if (response.success) {
        const newArticles = response.data.articles || [];
        
        if (reset) {
          setArticles(newArticles);
        } else {
          setArticles(prev => [...prev, ...newArticles]);
        }
        
        setHasMore(false); // Live news doesn't use pagination
        setLiveNewsStatus('online');
      } else {
        throw new Error(response.message || 'Failed to fetch live news');
      }
    } catch (error) {
      console.error('Live news fetch failed, falling back to local:', error);
      setLiveNewsStatus('offline');
      // Fallback to local news
      await loadLocalNews(reset);
    }
  };

  const loadLocalNews = async (reset = false) => {
    const currentPage = reset ? 1 : page;
    const params = {
      page: currentPage,
      limit: 12,
      q: filters.search,
      category: filters.category,
      tags: filters.tags,
      from: filters.dateFrom,
      to: filters.dateTo,
      sort: filters.sortBy,
      order: filters.sortOrder
    };

    const data = await articlesAPI.getArticles(params);
    const newArticles = data.items || [];
    
    if (reset) {
      setArticles(newArticles);
      setPage(2);
    } else {
      setArticles(prev => [...prev, ...newArticles]);
      setPage(prev => prev + 1);
    }
    
    setPagination(data.meta);
    setHasMore(data.meta?.hasNextPage || false);
  };

  // Update filters when URL params change
  useEffect(() => {
    const category = searchParams.get('category') || '';
    const country = searchParams.get('country') || '';
    setFilters(prev => ({ ...prev, category, country }));
  }, [searchParams]);

  useEffect(() => {
    loadArticles(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.category, filters.country, filters.tags, filters.dateFrom, filters.dateTo, filters.sortBy, filters.sortOrder]);

  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCategoryChange = (category) => {
    setFilters(prev => ({ ...prev, category: category === 'all' ? '' : category }));
  };

  const handleLoadMore = () => {
    loadArticles(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    setPage(1);
    setHasMore(true);
    setArticles([]);
    await loadArticles(true);
  };

  const handleSaveArticle = async (articleId) => {
    try {
      await saveArticle(articleId);
    } catch (e) {
      console.error('Error saving article:', e);
    }
  };

  const handleUnsaveArticle = async (articleId) => {
    try {
      await unsaveArticle(articleId);
    } catch (e) {
      console.error('Error unsaving article:', e);
    }
  };

  return (
    <div>
        {/* Search Bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div className="searchbar" style={{ position: 'relative', maxWidth: 600, flex: 1, minWidth: 300 }}>
              <Search className="input-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={useLiveNews ? "Search live news..." : "Search articles..."}
                className="input input--with-icon"
              />
            </div>
            
            {/* Live News Toggle */}
            <button
              onClick={() => {
                setUseLiveNews(!useLiveNews);
                setLiveNewsStatus('online');
                handleRefresh();
              }}
              className={`btn ${useLiveNews ? 'btn--primary' : 'btn--secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {liveNewsStatus === 'online' ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {useLiveNews ? 'Live News' : 'Local News'}
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn btn--secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {/* Status Indicator */}
          {useLiveNews && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 14 }}>
              {liveNewsStatus === 'online' ? (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Wifi className="w-4 h-4" />
                  Fetching live news from multiple sources
                </span>
              ) : (
                <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <WifiOff className="w-4 h-4" />
                  Live news unavailable, showing local articles
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div style={{ marginBottom: 32 }}>
          <CategoryTabs
            value={filters.category || 'all'}
            onChange={handleCategoryChange}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, marginBottom: 24, borderColor: 'var(--danger-100)' }}>
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span style={{ color: '#b91c1c' }}>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && articles.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="muted">Loading articles...</span>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && articles.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ width: 64, height: 64, background: 'var(--border)', borderRadius: 999, display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              No articles found
            </h3>
            <p className="muted">
              Try adjusting your filters or search terms
            </p>
          </div>
        )}

        {/* Articles Grid */}
        {articles.length > 0 && (
          <div className="grid-articles">
            {articles.map((article) => (
              <NewsCard 
                key={article._id} 
                item={article} 
                onSave={handleSaveArticle}
                onUnsave={handleUnsaveArticle}
                showSaveButton={true}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {articles.length > 0 && hasMore && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="btn btn--primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Articles'
              )}
            </button>
          </div>
        )}

        {/* End of Results */}
        {articles.length > 0 && !hasMore && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p className="muted">
              You've reached the end of the articles
            </p>
          </div>
        )}
    </div>
  );
}


