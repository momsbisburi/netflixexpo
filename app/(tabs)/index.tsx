import { Calendar, Play, Search, Star, Tv, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3ZDU3Y2IzMzhkY2JlZjVkMzU0NDM0ZjVkNjJlZDJhYiIsIm5iZiI6MTc0OTMzNDkzMS44MzEsInN1YiI6IjY4NDRiYjkzNDk1NzI3OTBiNjMwMTMwZiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.cFPjne15UXeEPyf1gSrHYVDGh7qlG5VnzgjxP57lbCU';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const NetflixClone = () => {
  const [movies, setMovies] = useState({
    trending: [],
    popular: [],
    topRated: [],
    upcoming: [],
    trendingTV: [],
    popularTV: [],
    topRatedTV: []
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerUrl, setPlayerUrl] = useState('');

  // Fetch content from TMDb API
  const fetchContent = async (endpoint, category) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return { [category]: data.results || [] };
    } catch (error) {
      console.error(`Error fetching ${category}:`, error);
      return { [category]: [] };
    }
  };

  // Load all content categories
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const [trending, popular, topRated, upcoming, trendingTV, popularTV, topRatedTV] = await Promise.all([
          fetchContent('/trending/movie/day', 'trending'),
          fetchContent('/movie/popular', 'popular'),
          fetchContent('/movie/top_rated', 'topRated'),
          fetchContent('/movie/upcoming', 'upcoming'),
          fetchContent('/trending/tv/day', 'trendingTV'),
          fetchContent('/tv/popular', 'popularTV'),
          fetchContent('/tv/top_rated', 'topRatedTV')
        ]);
        
        setMovies({
          ...trending,
          ...popular,
          ...topRated,
          ...upcoming,
          ...trendingTV,
          ...popularTV,
          ...topRatedTV
        });
      } catch (error) {
        console.error('Error loading content:', error);
        Alert.alert('Error', 'Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  // Search movies and TV shows
  const searchContent = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/search/multi?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      // Filter out people, keep only movies and TV shows
      const results = (data.results || [])
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => ({
          ...item,
          content_type: item.media_type,
          title: item.title || item.name, // Normalize title field
          release_date: item.release_date || item.first_air_date // Normalize date field
        }));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching content:', error);
      setSearchResults([]);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchContent(searchQuery);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  // Components
  const ContentCard = ({ content, onPress, style = {} }) => (
    <TouchableOpacity 
      style={[styles.movieCard, style]} 
      onPress={() => onPress(content)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: `${IMAGE_BASE_URL}${content.poster_path}` }}
        style={styles.moviePoster}
        resizeMode="cover"
      />
      <View style={styles.movieOverlay}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {content.title || content.name}
        </Text>
        <View style={styles.ratingContainer}>
          <Star size={12} color="#FFD700" fill="#FFD700" />
          <Text style={styles.rating}>
            {content.vote_average?.toFixed(1)}
          </Text>
          {content.content_type === 'tv' && (
            <Tv size={12} color="#888" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const FeaturedContent = ({ content }) => (
    <View style={styles.featuredContainer}>
      <Image
        source={{ uri: `${IMAGE_BASE_URL}${content.backdrop_path}` }}
        style={styles.featuredImage}
        resizeMode="cover"
      />
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredTitle}>{content.title || content.name}</Text>
        <Text style={styles.featuredOverview} numberOfLines={3}>
          {content.overview}
        </Text>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => openContentDetails(content)}
          activeOpacity={0.8}
        >
          <Play size={20} color="#000" fill="#fff" />
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ContentRow = ({ title, contents, onContentPress }) => (
    <View style={styles.movieRow}>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        data={contents}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <ContentCard 
            content={item} 
            onPress={onContentPress}
            style={styles.rowMovieCard}
          />
        )}
        contentContainerStyle={styles.movieRowList}
      />
    </View>
  );

  // Functions
  const openContentDetails = (content) => {
    setSelectedContent(content);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedContent(null);
  };

  const openSearch = () => {
    setIsSearchVisible(true);
  };

  const closeSearch = () => {
    setIsSearchVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const playContent = () => {
    const contentTitle = selectedContent?.title || selectedContent?.name;
    const contentId = selectedContent?.id;
    const contentType = selectedContent?.content_type || selectedContent?.media_type;
    
    console.log('=== PLAY CONTENT DEBUG ===');
    console.log('Content Title:', contentTitle);
    console.log('Content ID:', contentId);
    console.log('Content Type:', contentType);
    console.log('Selected Content Object:', selectedContent);
    
    if (!contentId) {
      console.log('❌ ERROR: No content ID found');
      Alert.alert('Error', 'Cannot play content - missing ID');
      return;
    }
    
    let url = '';
    if (contentType === 'movie') {
      url = `https://player.videasy.net/movie/${contentId}?overlay=true&color=E50914`;
      console.log('Movie URL to load:', url);
    } else if (contentType === 'tv') {
      url = `https://player.videasy.net/tv/${contentId}/1/1?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=E50914`;
      console.log('TV Show URL to load:', url);
    } else {
      console.log('❌ ERROR: Unknown content type');
      Alert.alert('Error', 'Cannot play content - unknown type');
      return;
    }
    
    setPlayerUrl(url);
    console.log('Setting player URL:', url);
    console.log('========================');
    
    setIsPlayerVisible(true);
    closeModal(); // Close the details modal when opening player
  };

  const closePlayer = () => {
    setPlayerUrl(''); // Clear the URL first
    setTimeout(() => {
      setIsPlayerVisible(false); // Then close the modal after a brief delay
    }, 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Loading amazing content...</Text>
      </View>
    );
  }

  const featuredContent = movies.trending[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.logo}>MOVIEFLIX</Text>
          <TouchableOpacity 
            onPress={openSearch}
            style={styles.searchButton}
            activeOpacity={0.7}
          >
            <Search size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Content */}
        {featuredContent && <FeaturedContent content={featuredContent} />}

        {/* Content Rows */}
        <ContentRow 
          title="🔥 Trending Movies" 
          contents={movies.trending} 
          onContentPress={openContentDetails}
        />
        
        <ContentRow 
          title="📺 Trending TV Shows" 
          contents={movies.trendingTV} 
          onContentPress={openContentDetails}
        />
        
        <ContentRow 
          title="⭐ Popular Movies" 
          contents={movies.popular} 
          onContentPress={openContentDetails}
        />
        
        <ContentRow 
          title="📺 Popular TV Shows" 
          contents={movies.popularTV} 
          onContentPress={openContentDetails}
        />
        
        <ContentRow 
          title="🏆 Top Rated Movies" 
          contents={movies.topRated} 
          onContentPress={openContentDetails}
        />
        
        <ContentRow 
          title="🏆 Top Rated TV Shows" 
          contents={movies.topRatedTV} 
          onContentPress={openContentDetails}
        />
        
        <ContentRow 
          title="🎬 Coming Soon" 
          contents={movies.upcoming} 
          onContentPress={openContentDetails}
        />
      </ScrollView>

      {/* Content Details Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedContent && (
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
              
              <Image
                source={{ 
                  uri: `${IMAGE_BASE_URL}${selectedContent.backdrop_path}`
                }}
                style={styles.modalImage}
                resizeMode="cover"
              />
              
              <View style={styles.modalDetails}>
                <Text style={styles.modalTitle}>
                  {selectedContent.title || selectedContent.name}
                </Text>
                
                <View style={styles.modalMetadata}>
                  <View style={styles.metadataItem}>
                    <Star size={16} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.metadataText}>
                      {selectedContent.vote_average?.toFixed(1)}/10
                    </Text>
                  </View>
                  <View style={styles.metadataItem}>
                    {selectedContent.content_type === 'tv' || selectedContent.media_type === 'tv' ? (
                      <>
                        <Tv size={16} color="#888" />
                        <Text style={styles.metadataText}>TV Show</Text>
                      </>
                    ) : (
                      <>
                        <Calendar size={16} color="#888" />
                        <Text style={styles.metadataText}>
                          {selectedContent.release_date?.split('-')[0]}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.modalPlayButton}
                  onPress={playContent}
                  activeOpacity={0.8}
                >
                  <Play size={24} color="#000" fill="#fff" />
                  <Text style={styles.modalPlayButtonText}>
                    {(selectedContent.content_type === 'tv' || selectedContent.media_type === 'tv') ? 'Watch Series' : 'Play Movie'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.modalOverview}>
                  {selectedContent.overview || 'No description available.'}
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={isSearchVisible}
        animationType="slide"
        onRequestClose={closeSearch}
      >
        <SafeAreaView style={styles.searchModalContainer}>
          <View style={styles.searchHeader}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search movies & TV shows..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity 
              style={styles.searchCloseButton}
              onPress={closeSearch}
              activeOpacity={0.7}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            renderItem={({ item }) => (
              <ContentCard 
                content={item} 
                onPress={(content) => {
                  closeSearch();
                  openContentDetails(content);
                }}
                style={styles.searchMovieCard}
              />
            )}
            contentContainerStyle={styles.searchResults}
          />
        </SafeAreaView>
      </Modal>

      {/* VIDEASY PLAYER MODAL */}
      <Modal
        visible={isPlayerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePlayer}
      >
        <SafeAreaView style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity 
              style={styles.playerCloseButton}
              onPress={closePlayer}
              activeOpacity={0.7}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>
              {selectedContent?.title || selectedContent?.name}
            </Text>
          </View>
          
          <WebView
            source={{ uri: playerUrl || 'about:blank' }}
            style={styles.webPlayer}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            originWhitelist={['https://*']}
            mixedContentMode={'always'}
            onShouldStartLoadWithRequest={(request) => {
              // Don't block about:blank
              if (request.url === 'about:blank') {
                return true;
              }
              
              console.log('=== LOAD REQUEST ===');
              console.log('URL:', request.url);
              console.log('Main document URL:', request.mainDocumentURL);
              console.log('Navigation type:', request.navigationType);
              console.log('Is for main frame:', request.isForMainFrame);
              
              // Strict whitelist - only allow Videasy and essential resources
              const allowedDomains = [
                'videasy.net',
                'player.videasy.net',
                'videasy.org'
              ];
              
              const isVideasyDomain = allowedDomains.some(domain => 
                request.url.includes(domain)
              );
              
              const isEssentialResource = request.url.startsWith('blob:') || 
                                        request.url.startsWith('data:') ||
                                        request.url.startsWith('about:') ||
                                        request.url === playerUrl;
              
              // Block everything that's not Videasy or essential
              if (!isVideasyDomain && !isEssentialResource) {
                console.log('🚫 BLOCKED NON-VIDEASY URL:', request.url);
                return false;
              }
              
              // Additional blocking for known bad patterns
              const blockedPatterns = [
                'aliexpress',
                'alibaba', 
                'muermoabject',
                'click.',
                'redirect',
                'popup',
                'ad',
                'promo',
                '/e/_',
                'scontext',
                'affiliate'
              ];
              
              const hasBlockedPattern = blockedPatterns.some(pattern => 
                request.url.toLowerCase().includes(pattern.toLowerCase())
              );
              
              if (hasBlockedPattern) {
                console.log('🚫 BLOCKED PATTERN MATCH:', request.url);
                return false;
              }
              
              console.log('✅ ALLOWED:', request.url);
              console.log('====================');
              return true;
            }}
            injectedJavaScript={`
              // Enhanced ad blocking and popup prevention script
              (function() {
                console.log('Injected ad blocker starting...');
                
                // Block ALL popup windows and new tabs
                const originalOpen = window.open;
                window.open = function(url, name, specs) { 
                  console.log('Blocked popup attempt to:', url);
                  return null; 
                };
                
                // Block page redirects aggressively
                const originalAssign = window.location.assign;
                const originalReplace = window.location.replace;
                const originalReload = window.location.reload;
                
                window.location.assign = function(url) {
                  if (!url.includes('videasy')) {
                    console.log('Blocked location.assign to:', url);
                    return;
                  }
                  return originalAssign.call(this, url);
                };
                
                window.location.replace = function(url) {
                  if (!url.includes('videasy')) {
                    console.log('Blocked location.replace to:', url);
                    return;
                  }
                  return originalReplace.call(this, url);
                };
                
                // Override href setter
                Object.defineProperty(window.location, 'href', {
                  set: function(url) {
                    if (!url.includes('videasy') && !url.startsWith('blob:') && !url.startsWith('data:')) {
                      console.log('Blocked location.href redirect to:', url);
                      return;
                    }
                    window.location.assign(url);
                  },
                  get: function() {
                    return window.location.toString();
                  }
                });
                
                // Block ads by removing common ad elements
                function removeAds() {
                  const adSelectors = [
                    '[id*="ad"]', '[class*="ad"]', '[id*="banner"]', 
                    '[class*="banner"]', '[id*="popup"]', '[class*="popup"]',
                    'iframe[src*="ads"]', 'iframe[src*="doubleclick"]',
                    '[id*="google_ads"]', '[class*="google-ad"]',
                    '.advertisement', '.ads', '.ad-container',
                    '[data-ad-slot]', '[data-ad-client]',
                    '[href*="alibaba"]', '[href*="aliexpress"]',
                    '[href*="deignsaspalax"]', '[onclick*="redirect"]'
                  ];
                  
                  adSelectors.forEach(selector => {
                    try {
                      const elements = document.querySelectorAll(selector);
                      elements.forEach(el => {
                        console.log('Removing ad element:', el);
                        el.remove();
                      });
                    } catch(e) {}
                  });
                  
                  // Remove suspicious links
                  const links = document.querySelectorAll('a');
                  links.forEach(link => {
                    if (link.href && !link.href.includes('videasy') && 
                        (link.href.includes('alibaba') || 
                         link.href.includes('deignsaspalax') ||
                         link.href.includes('redirect'))) {
                      console.log('Removing suspicious link:', link.href);
                      link.remove();
                    }
                  });
                }
                
                // Remove ads immediately and every second
                removeAds();
                setInterval(removeAds, 1000);
                
                // Block all click events on suspicious elements
                document.addEventListener('click', function(e) {
                  const target = e.target;
                  const href = target.href || target.getAttribute('href') || '';
                  const onclick = target.getAttribute('onclick') || '';
                  
                  if (!href.includes('videasy') && 
                      (href.includes('alibaba') || 
                       href.includes('deignsaspalax') ||
                       href.includes('redirect') ||
                       onclick.includes('redirect'))) {
                    console.log('Blocked suspicious click:', href || onclick);
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }, true);
                
                // Block context menu
                document.addEventListener('contextmenu', function(e) {
                  e.preventDefault();
                });
                
                // Prevent alert/confirm dialogs
                window.alert = function() {};
                window.confirm = function() { return false; };
                
                // Block focus stealing
                window.blur = function() {};
                window.focus = function() {};
                
                // Monitor for page changes and block redirects
                let currentUrl = window.location.href;
                let urlCheckInterval = setInterval(function() {
                  if (window.location.href !== currentUrl) {
                    if (!window.location.href.includes('videasy')) {
                      console.log('Detected unauthorized redirect, going back');
                      window.history.back();
                    }
                    currentUrl = window.location.href;
                  }
                }, 500);
                
                console.log('Enhanced ad blocker initialized');
              })();
            `}
            renderLoading={() => (
              <View style={styles.playerLoading}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.playerLoadingText}>
                  Loading {(selectedContent?.content_type === 'tv' || selectedContent?.media_type === 'tv') ? 'TV Show' : 'Movie'}...
                </Text>
              </View>
            )}
            onLoadStart={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              
              console.log('=== WEBVIEW LOAD START ===');
              console.log('Player URL state:', playerUrl);
              console.log('Actual URL being loaded:', nativeEvent.url);
              console.log('Loading:', nativeEvent.loading);
              console.log('Title:', nativeEvent.title);
              console.log('==========================');
            }}
            onLoad={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('=== WEBVIEW LOADED ===');
              console.log('Loaded URL:', nativeEvent.url);
              console.log('Title:', nativeEvent.title);
              console.log('Can go back:', nativeEvent.canGoBack);
              console.log('Can go forward:', nativeEvent.canGoForward);
              console.log('======================');
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('WebView error: ', nativeEvent);
              
              // Don't show error for about:blank or when player is closing
              if (nativeEvent.url === 'about:blank' || !playerUrl) {
                return;
              }
              
              Alert.alert(
                'Player Error', 
                'Cannot load video player. Please try again.',
                [{ text: 'OK', onPress: closePlayer }]
              );
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('WebView HTTP error: ', nativeEvent);
            }}
            onNavigationStateChange={(navState) => {
              console.log('=== NAVIGATION CHANGE ===');
              console.log('URL:', navState.url);
              console.log('Title:', navState.title);
              console.log('Loading:', navState.loading);
              console.log('Can go back:', navState.canGoBack);
              console.log('Can go forward:', navState.canGoForward);
              
              // Block navigation to non-Videasy domains
              const allowedDomains = [
                'videasy.net',
                'player.videasy.net', 
                'videasy.org'
              ];
              
              const isVideasyDomain = allowedDomains.some(domain => 
                navState.url.includes(domain)
              );
              
              // If navigated away from Videasy, go back
              if (!navState.loading && !isVideasyDomain && 
                  !navState.url.startsWith('about:') && 
                  !navState.url.startsWith('data:') && 
                  navState.url !== playerUrl) {
                console.log('🚫 DETECTED REDIRECT, GOING BACK FROM:', navState.url);
                console.log('Original URL was:', playerUrl);
                
                // Force reload the original URL
                setTimeout(() => {
                  console.log('Reloading original URL:', playerUrl);
                  setPlayerUrl(''); // Clear first
                  setTimeout(() => setPlayerUrl(playerUrl), 100); // Then reload
                }, 500);
              }
              
              console.log('==========================');
            }}
          />
        </SafeAreaView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  headerSafe: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E50914',
  },
  searchButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  featuredContainer: {
    height: height * 0.6,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 80,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  featuredTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  featuredOverview: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 20,
    lineHeight: 22,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  movieRow: {
    marginVertical: 24,
  },
  rowTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 20,
    marginBottom: 16,
  },
  movieRowList: {
    paddingLeft: 20,
  },
  movieCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  rowMovieCard: {
    marginRight: 12,
  },
  moviePoster: {
    width: '100%',
    height: 200,
  },
  movieOverlay: {
    padding: 8,
  },
  movieTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 10,
    color: '#FFD700',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContent: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: 300,
  },
  modalDetails: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalMetadata: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metadataText: {
    color: '#ccc',
    marginLeft: 6,
    fontSize: 14,
  },
  modalPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  modalPlayButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverview: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  searchCloseButton: {
    marginLeft: 16,
    padding: 8,
  },
  searchResults: {
    padding: 16,
  },
  searchMovieCard: {
    width: (width - 48) / 2,
    margin: 4,
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playerCloseButton: {
    marginRight: 16,
    padding: 8,
  },
  playerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  webPlayer: {
    flex: 1,
  },
  playerLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playerLoadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NetflixClone;