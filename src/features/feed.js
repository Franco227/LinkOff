import {
  BY_COMPANIES_KEYWORD,
  BY_PEOPLE_KEYWORD,
  CAROUSEL_KEYWORD,
  COMMENTED_ON_KEYWORD,
  DROPDOWN_TRIGGER_SELECTOR,
  FEED_SELECTOR,
  FOLLOWED_KEYWORD,
  IMAGE_KEYWORD,
  LIKED_KEYWORDS,
  LINKS_KEYWORD,
  OTHER_REACTIONS_KEYWORDS,
  POLLS_KEYWORD,
  POST_CONTENT_SELECTOR,
  POST_SELECTOR,
  PROMOTED_KEYWORD,
  RECENT_OPTION_SELECTOR,
  SHARED_KEYWORD,
  SUGGESTED_KEYWORD,
  VIDEO_KEYWORD,
} from '../constants.js'
import {
  getCustomSelector,
  hidePost,
  removeHideClasses,
  resetBlockedPosts,
  resetShownPosts,
  waitForSelector,
} from '../utils.js'

let runs = 0
let feedInterval
let postCountPrompted = false
let baseFeedKeywords = []
let oldBaseFeedKeywords = []
let customFeedKeywords = []
let oldCustomFeedKeywords = []

const handleSortByRecent = async (checkNeedUpdate) => {
  if (!checkNeedUpdate('sort-by-recent', true)) return

  if (!window.location.pathname.startsWith('/feed/')) return

  const dropdownTrigger = await waitForSelector(DROPDOWN_TRIGGER_SELECTOR)

  dropdownTrigger?.click()

  const recentOption = await waitForSelector(RECENT_OPTION_SELECTOR)

  recentOption?.click()
}

const handleAgeFiltering = (keywords, age) => {
  const ageKeywords = {
    hour: 'h •',
    day: 'd •',
    week: 'w •',
    month: 'mo •',
    year: 'y •',
  }

  const hideByHour = (shouldLoop = true) => {
    if (shouldLoop) {
      for (let x = 2; x <= 24; x++) {
        keywords.push(`${x}${ageKeywords.hour}`)
      }
    } else {
      keywords.push(`${ageKeywords.hour}`)
    }

    hideByDay(false)
  }

  const hideByDay = (shouldLoop) => {
    if (shouldLoop) {
      for (let x = 2; x <= 30; x++) {
        keywords.push(`${x}${ageKeywords.day}`)
      }
    } else {
      keywords.push(`${ageKeywords.day}`)
    }

    hideByWeek(false)
  }

  const hideByWeek = (shouldLoop) => {
    if (shouldLoop) {
      for (let x = 2; x <= 4; x++) {
        keywords.push(`${x}${ageKeywords.week}`)
      }
    } else {
      keywords.push(`${ageKeywords.week}`)
    }

    hideByMonth(false)
  }

  const hideByMonth = (shouldLoop) => {
    if (shouldLoop) {
      for (let x = 2; x <= 12; x++) {
        keywords.push(`${x}${ageKeywords.month}`)
      }
    } else {
      keywords.push(`${ageKeywords.month}`)
    }
    hideByYear(false)
  }

  const hideByYear = (shouldLoop) => {
    if (shouldLoop) {
      for (let x = 2; x <= 5; x++) {
        keywords.push(`${x}${ageKeywords.year}`)
      }
    } else {
      keywords.push(`${ageKeywords.year}`)
    }
  }

  switch (age) {
    case 'hour':
      hideByHour(keywords)
      break

    case 'day':
      hideByDay(keywords)
      break

    case 'week':
      hideByWeek(keywords)
      break

    case 'month':
      hideByMonth(keywords)
      break

    case 'year':
      hideByYear(keywords)
      break
  }
}

const getBaseFeedKeywords = (config) => {
  const keywords = []

  const hideByAge = config['hide-by-age']

  if (hideByAge !== 'disabled') {
    handleAgeFiltering(keywords, hideByAge)
  }

  if (config['hide-carousels']) keywords.push(CAROUSEL_KEYWORD)
  if (config['hide-videos']) keywords.push(VIDEO_KEYWORD)
  if (config['hide-images']) keywords.push(IMAGE_KEYWORD)
  if (config['hide-polls']) keywords.push(POLLS_KEYWORD)
  if (config['hide-links']) keywords.push(LINKS_KEYWORD)
  if (config['hide-promoted']) keywords.push(PROMOTED_KEYWORD)
  if (config['hide-shared']) keywords.push(SHARED_KEYWORD)
  if (config['hide-followed']) keywords.push(FOLLOWED_KEYWORD)
  if (config['hide-liked']) keywords.push(...LIKED_KEYWORDS)
  if (config['hide-other-reactions']) keywords.push(...OTHER_REACTIONS_KEYWORDS)
  if (config['hide-commented-on']) keywords.push(COMMENTED_ON_KEYWORD)
  if (config['hide-by-companies']) keywords.push(BY_COMPANIES_KEYWORD)
  if (config['hide-by-people']) keywords.push(BY_PEOPLE_KEYWORD)
  if (config['hide-suggested']) keywords.push(SUGGESTED_KEYWORD)

  console.log('LinkOff: Current base feed keywords are', keywords)

  return keywords
}

const getCustomFeedKeywords = (config) => {
  return config['feed-keywords'] === '' ? [] : config['feed-keywords'].split(',')
}

const blockPostsByKeywords = (baseKeywords, customKeywords, contentOnly, mode, disablePostCount) => {
  if (oldBaseFeedKeywords.some((kw) => !baseKeywords.includes(kw)) || oldCustomFeedKeywords.some((kw) => !customKeywords.includes(kw))) {
    resetShownPosts()
  }

  oldBaseFeedKeywords = baseKeywords
  oldCustomFeedKeywords = customKeywords

  let posts

  const runBlockPosts = () => {
    if (runs % 10 === 0) resetBlockedPosts()
    // Select posts which are not already hidden
    posts = document.querySelectorAll(
      getCustomSelector(POST_SELECTOR, 'pristine')
    )

    // Filter only if there are enough posts to load more
    if (posts.length > 5 || mode == 'dim') {
      posts.forEach((post) => {
        const postContent = post.querySelector(POST_CONTENT_SELECTOR)

        const baseKeywordIndex = baseKeywords.findIndex(
          (keyword) => post.outerHTML.indexOf(keyword) !== -1
        )
        const customKeywordIndex = customKeywords.findIndex(
          (keyword) => contentOnly && postContent ? postContent.outerHTML.indexOf(keyword) !== -1 : post.outerHTML.indexOf(keyword) !== -1
        )

        if (baseKeywordIndex === -1 && customKeywordIndex === -1) {
          removeHideClasses(post)
          post.dataset.hidden = false
        } else {
          hidePost(post, mode)
        }
      })
    } else {
      if (!postCountPrompted && !disablePostCount) {
        postCountPrompted = true
        alert(
          'Scroll down to start blocking posts (LinkedIn needs at least 10 loaded to load new ones).\n\nTo disable this alert, toggle it under misc in LinkOff settings'
        )
      }
    }
  }

  if (baseKeywords.length || customKeywords.length)
    feedInterval = setInterval(() => {
      runBlockPosts()
      runs++
    }, 350)
}

const toggleFeed = async (shown) => {
  if (!window.location.pathname.startsWith('/feed/')) return

  if (shown) {
    document.querySelector(FEED_SELECTOR)?.classList.remove('hide')
    console.log(`LinkOff: feed enabled`)
  } else {
    document.querySelector(FEED_SELECTOR)?.classList.add('hide')
    console.log(`LinkOff: feed disabled`)
  }
}

const handleToggledOff = () => {
  toggleFeed(true)

  clearInterval(feedInterval)
  resetBlockedPosts()
  resetShownPosts()
}

const handleHideWholeFeed = () => {
  toggleFeed(false)
  resetBlockedPosts()
  clearInterval(feedInterval)
}

const handleFilterFeed = (mode, config) => {
  toggleFeed(true)

  resetBlockedPosts()
  clearInterval(feedInterval)
  blockPostsByKeywords(baseFeedKeywords, customFeedKeywords, config['hide-from-post-content'], mode, config['disable-postcount-prompt'])
}

export default (checkNeedUpdate, enabled, mode, config) => {
  if (checkNeedUpdate('main-toggle', false)) {
    handleToggledOff()

    return
  }

  if (checkNeedUpdate('hide-whole-feed', true)) {
    handleHideWholeFeed()
    return
  }

  if (!enabled) return

  handleSortByRecent(checkNeedUpdate)

  baseFeedKeywords = getBaseFeedKeywords(config)
  customFeedKeywords = getCustomFeedKeywords(config)

  if (baseFeedKeywords !== oldBaseFeedKeywords || customFeedKeywords !== oldCustomFeedKeywords) {
    handleFilterFeed(mode, config)
  }
}
