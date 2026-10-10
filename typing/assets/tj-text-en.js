/* Todok English practice text. Sentences were written for this site, the word list is our own pick of very common words,
   pangrams are either long-standing anonymous ones or written here. No books, articles, lyrics, poems, film lines or quotes.
   Only characters a US keyboard can type (checked by tests/run.mjs "texts"). */
(function (root) {
  'use strict';
  var D = {
    /* very common words, alphabetical */
    words: [
      'able', 'about', 'above', 'across', 'add', 'after', 'afternoon', 'again', 'air', 'all', 'almost', 'along', 'already', 'also', 'always', 'and',
      'animal', 'another', 'answer', 'any', 'around', 'ask', 'autumn', 'away', 'back', 'because', 'been', 'before', 'began', 'begin', 'being', 'below',
      'best', 'better', 'between', 'big', 'book', 'both', 'box', 'bread', 'bridge', 'bring', 'build', 'but', 'buy', 'call', 'came', 'can',
      'car', 'care', 'carry', 'change', 'children', 'city', 'clean', 'close', 'coffee', 'cold', 'come', 'corner', 'could', 'country', 'cut', 'day',
      'desk', 'did', 'different', 'dinner', 'does', 'done', 'door', 'down', 'dozen', 'draw', 'drive', 'each', 'early', 'earth', 'eat', 'email',
      'end', 'enough', 'equal', 'even', 'evening', 'every', 'example', 'eye', 'face', 'family', 'far', 'fast', 'feel', 'few', 'find', 'finger',
      'first', 'follow', 'food', 'for', 'form', 'found', 'four', 'friend', 'from', 'full', 'game', 'garden', 'gave', 'get', 'give', 'glass',
      'good', 'great', 'group', 'grow', 'had', 'hand', 'hard', 'has', 'have', 'head', 'hear', 'help', 'her', 'here', 'high', 'him',
      'his', 'home', 'hot', 'house', 'how', 'idea', 'important', 'into', 'its', 'job', 'jump', 'just', 'keep', 'key', 'kind', 'kitchen',
      'know', 'land', 'large', 'last', 'late', 'later', 'lazy', 'learn', 'leave', 'left', 'less', 'letter', 'life', 'light', 'like', 'line',
      'list', 'little', 'live', 'long', 'look', 'lunch', 'made', 'make', 'man', 'many', 'market', 'may', 'mean', 'might', 'mile', 'minute',
      'more', 'morning', 'most', 'mother', 'move', 'much', 'music', 'must', 'name', 'near', 'need', 'never', 'new', 'next', 'night', 'not',
      'now', 'number', 'off', 'office', 'often', 'old', 'once', 'one', 'only', 'open', 'other', 'our', 'out', 'over', 'own', 'page',
      'paper', 'part', 'people', 'picture', 'place', 'plan', 'play', 'pocket', 'point', 'put', 'quarter', 'question', 'quick', 'quiet', 'quite', 'rain',
      'read', 'ready', 'real', 'right', 'river', 'road', 'room', 'run', 'said', 'same', 'saw', 'say', 'school', 'sea', 'season', 'second',
      'see', 'seem', 'sentence', 'set', 'she', 'short', 'should', 'show', 'side', 'since', 'six', 'size', 'small', 'some', 'song', 'soon',
      'sound', 'spell', 'stand', 'start', 'state', 'still', 'stop', 'story', 'street', 'study', 'such', 'summer', 'sun', 'sure', 'table', 'take',
      'talk', 'tell', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'thing', 'think', 'this', 'those', 'thought',
      'three', 'through', 'ticket', 'time', 'today', 'together', 'too', 'took', 'town', 'tree', 'try', 'turn', 'two', 'under', 'until', 'use',
      'very', 'visit', 'voice', 'wait', 'walk', 'want', 'warm', 'was', 'watch', 'water', 'wax', 'way', 'week', 'well', 'went', 'were',
      'what', 'when', 'where', 'which', 'while', 'white', 'who', 'why', 'will', 'window', 'winter', 'with', 'without', 'word', 'work', 'world',
      'would', 'write', 'year', 'yellow', 'yes', 'yet', 'you', 'young', 'your', 'zero', 'zone'
    ],
    sentences: [
      'The bus was late again, so I walked to the office.',
      'She keeps a small notebook in her coat pocket.',
      'We fixed the fence before the rain started.',
      'Can you send me the file before lunch?',
      'He boiled water for tea and forgot about it.',
      'The library closes early on the first Monday of each month.',
      'My keyboard has a sticky space bar.',
      'They painted the kitchen a soft shade of green.',
      'I saved the draft twice, just to be sure.',
      'The map on my phone sent us down a gravel road.',
      'Please check the date and the amount one more time.',
      'The cat sat on the warm laptop and refused to move.',
      'Our team meets every Tuesday at nine.',
      'He typed the wrong address and the email bounced back.',
      'Fresh bread smells best right out of the oven.',
      'It took three tries to park between the two trucks.',
      'She learned to type without looking at her hands.',
      'The meeting ran long, so we skipped the coffee break.',
      'Turn left at the bakery, then go straight for two blocks.',
      'I backed up my photos to an external drive last night.',
      'The printer jammed just as the deadline arrived.',
      'He wrote a short list: milk, eggs, rice, and soap.',
      'Did you remember to lock the back door?',
      'The train leaves at 7:45, so we should be there by 7:30.',
      'Small errors are easier to fix when you catch them early.',
      'We watched the snow pile up on the window ledge.',
      'Her handwriting is neat, but her typing is faster.',
      'The report is due on Friday; the slides can wait.',
      'I keep my fingers on the home row when I rest.',
      'A quiet room helps me focus on long documents.',
      'The new intern asked sharp questions on her first day.',
      'Mix the flour and sugar before you add the butter.',
      'Our neighbor grows tomatoes on a tiny balcony.',
      '"Wait for me," she said, "I\'m almost done."',
      'The password must have at least twelve characters.',
      'He fixed the bug, ran the tests, and went home.',
      'It\'s easier to keep a desk clean than to clean it.',
      'The ferry crosses the bay in about twenty minutes.',
      'We ordered two pizzas; only one arrived.',
      'Every key has a finger that should reach for it.',
      'I can\'t find my glasses, and I\'m wearing them.',
      'The streetlights came on one by one at dusk.',
      'Autumn leaves covered the path to the lake.',
      'Read the question twice before you answer.',
      'The elevator was broken, so we took the stairs.',
      'Type the same word five times and it starts to look strange.',
      'My sister left her umbrella on the train this morning.',
      'The grocery store moved the rice to aisle six.',
      'He counted the chairs twice and still came up one short.',
      'Your order (number 4821) will ship within 3 days.'
    ],
    /* every letter at least once */
    pangrams: [
      'The quick brown fox jumps over the lazy dog.',
      'Pack my box with five dozen liquor jugs.',
      'Six big jazz players quickly moved the wax from the van.',
      'My dog quickly jumped over five boxes while the zebra slept in the hut.'
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
  else (root.TJ_TEXT = root.TJ_TEXT || {}).en = D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
