#!/usr/bin/env python3
"""영어판(/en/)을 만든다: 계산기 페이지, 영어 가이드 글, 가이드 목록, 소개 페이지.

직접 돌리지 않고 `python3 date-calc/tools/build_guides.py` 한 번으로 한국어·영어를 같이 만든다.
- en/index.html = index.html(계산기 마크업은 한 곳에만) + assets/i18n.js 영어 사전. 그래서 검색엔진이 자바스크립트 없이도 영어를 본다.
  index.html·i18n.js 화면 글자를 고치면 다시 돌린다(tools/check_en.py가 낡은 파일을 잡는다).
- 영어 글은 한국어 글의 번역이 아니라 영어 검색 질문으로 고른 주제(2026-10-05). 글 속 예시 숫자는 tests/run.js 'Guide (en):' 묶음이 검산한다.
- 사실은 확인한 공식 출처만 적는다(OPM, 5 U.S.C. 6103, CFPB Reg Z, Microsoft·Python·MDN 문서). 출처 목록은 글마다 sources에.
"""
import html, json, os, re
from html.parser import HTMLParser

from build_guides import ROOT, BASE, AD_HEAD, crumbs, write

E = html.escape
UPDATED = "2026-10-05"
UPDATED_TEXT = "October 5, 2026"
ORG = {"@type": "Organization", "name": "Lumen Lab", "url": "https://lumenlab.page/"}
FONT = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media=\'all\'">'
HANGUL = re.compile("[ᄀ-ᇿ㄰-㆏가-힯]")

# 한국어 ↔ 영어가 같은 내용인 페이지만 hreflang으로 잇는다(가이드 글은 주제가 달라 잇지 않는다)
PAIRS = {"/": "/en/", "/about/": "/en/about/"}


def alternates(ko, en):
    return (f'<link rel="alternate" hreflang="ko" href="{BASE}{ko}">\n'
            f'<link rel="alternate" hreflang="en" href="{BASE}{en}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{BASE}{en}">\n')


# ---------------------------------------------------------------- 영어 가이드 글
# slug, 제목(h1), 짧은 제목(목록·빵가루), 설명(meta), 목록 한 줄, 계산기 해시, 버튼 글, 본문, 출처, 이어서 볼 글
GUIDES = [
    {
        "slug": "days-between-dates",
        "title": "How to count the days between two dates (and when to add 1)",
        "short": "Days between two dates: when to add 1",
        "desc": "Subtract the earlier date from the later one, and add 1 only if both the first and last day count. Examples for countdowns, trips, leap years and spreadsheets.",
        "blurb": "Inclusive or exclusive counts, countdowns and leap years",
        "tool": "period",
        "cta": "Count the days between two dates",
        "body": """
<p>Subtract the earlier date from the later one. From October 5 to December 25, 2026 that gives <b>81 days</b>. That's the plain subtraction answer, and it's what "how many days until Christmas?" means. Add 1 only when both the first and the last day should be counted, as in "October 5 through December 25": that's <b>82 days</b>.</p>

<h2>Pick the count that fits the question</h2>
<p>The two answers differ by whether the start date is day 0 or day 1. Using June 1 to June 5 as the example:</p>
<table>
<thead><tr><th>Question</th><th>How to count</th><th>June 1 to June 5</th></tr></thead>
<tbody>
<tr><td>How many days until June 5?</td><td>Subtract</td><td>4 days</td></tr>
<tr><td>How many nights is the hotel stay?</td><td>Subtract</td><td>4 nights</td></tr>
<tr><td>How long ago did it start?</td><td>Subtract</td><td>4 days</td></tr>
<tr><td>How many days does the trip last?</td><td>Subtract, then add 1</td><td>5 days</td></tr>
<tr><td>How many days did I work, June 1 through June 5?</td><td>Subtract, then add 1</td><td>5 days</td></tr>
</tbody>
</table>
<p>It's the same trap as counting fence posts: a fence with 4 sections has 5 posts. Subtraction counts the gaps between dates, and the inclusive count counts the dates themselves.</p>

<h2>Counting down to a date</h2>
<p>A countdown is plain subtraction, so it reaches 0 on the day itself. On October 5, 2026 there are 81 days left until Friday, December 25. On December 24 there is 1 day left, and on December 25 the count is 0. If a countdown shows 82 on October 5, it is counting today as well. The <a href="/en/#dday">countdown calculator</a> uses subtraction.</p>
<p>81 days is also 11 weeks and 4 days, or 2 months and 20 days. The months are counted from date to date (October 5 to December 5 is two months), not by dividing by 30.</p>

<h2>Why dividing by 30 goes wrong</h2>
<p>Months have 28 to 31 days, so one division can't turn days into months. March 1 to April 15, 2026 is 45 days. Divided by 30 that looks like a month and a half, but on the calendar it is <b>1 month and 14 days</b>: March 1 to April 1 is one month, then 14 more days. Month ends cause the biggest surprises, which is covered in <a href="/en/guide/adding-months/">what happens when you add a month to January 31</a>.</p>

<h2>Leap years add a day</h2>
<p>February 1 to March 1 is 28 days in 2026 and 29 days in 2028. A whole year, January 1 to December 31, is 364 days by subtraction in 2026 (365 counting both ends) and 365 days in 2028 (366 counting both ends). A year is a leap year when it divides by 4, except century years that don't divide by 400: 2000 was a leap year and 2100 won't be.</p>

<h2>In a spreadsheet</h2>
<p>Excel stores dates as serial numbers, so <code>=B2-A2</code> gives the subtraction count and <code>=B2-A2+1</code> the inclusive one. The <code>DAYS</code> function does the same subtraction; in Microsoft's example, <code>=DAYS("15-MAR-2021","1-FEB-2021")</code> returns 42.</p>
<p>If you need working days rather than calendar days, see <a href="/en/guide/business-days/">how to count business days</a>.</p>
""",
        "sources": [
            ("Microsoft Support: DAYS function", "https://support.microsoft.com/en-us/office/days-function-57740535-d549-4395-8728-0f07bff0b9df"),
        ],
        "related": ["adding-months", "business-days", "exact-age"],
    },
    {
        "slug": "business-days",
        "title": "How to count business days and find a deadline",
        "short": "Counting business days",
        "desc": "A business day is a weekday that isn't a holiday. How to find the date 5 or 10 business days away, whether today counts, and which US holidays are skipped.",
        "blurb": "Deadlines like “within 5 business days”, step by step",
        "tool": "workadd",
        "cta": "Find the date N business days away",
        "body": """
<p>A business day is a Monday to Friday that isn't a public holiday. To find a deadline N business days away, start counting on the next day and skip weekends and holidays. Five business days after Wednesday, November 25, 2026 is <b>Thursday, December 3</b>, because Thanksgiving (November 26) and the weekend don't count.</p>

<h2>The same example, day by day</h2>
<table>
<thead><tr><th>Date (2026)</th><th>Counted as</th></tr></thead>
<tbody>
<tr><td>Wed, Nov 25</td><td>Starting day, not counted</td></tr>
<tr><td>Thu, Nov 26</td><td>Skipped: Thanksgiving</td></tr>
<tr><td>Fri, Nov 27</td><td>Business day 1</td></tr>
<tr><td>Sat, Nov 28 and Sun, Nov 29</td><td>Skipped: weekend</td></tr>
<tr><td>Mon, Nov 30</td><td>Business day 2</td></tr>
<tr><td>Tue, Dec 1</td><td>Business day 3</td></tr>
<tr><td>Wed, Dec 2</td><td>Business day 4</td></tr>
<tr><td>Thu, Dec 3</td><td>Business day 5</td></tr>
</tbody>
</table>
<p>Forgetting the holiday gives Wednesday, December 2, one day early. The day after Thanksgiving is not a federal holiday, so it counts as a business day here. If your office is closed that day, add one more day.</p>

<h2>Does today count?</h2>
<p>The calculator never counts the starting day: business day 1 is the first business day after it. If you send a form on Monday, October 5, 2026 and are told to expect a reply within 3 business days, the calculator gives Thursday, October 8. Not everyone counts this way, so when a contract or a rule spells out how to count, follow its wording.</p>

<h2>Business days in a date range</h2>
<p>To count the business days in a period, count the weekdays and subtract the holidays that fall on them. July 2026 has 31 days, 8 of them on a weekend, which leaves 23 weekdays. Independence Day falls on Saturday, July 4 that year, so federal offices take Friday, July 3 off instead, and the month ends up with <b>22 business days</b>. November 2026 has 19: 21 weekdays minus Veterans Day (Wednesday, November 11) and Thanksgiving (Thursday, November 26).</p>
<p>In the <a href="/en/#workdays">business day counter</a>, the end date always counts, and the start date counts while "Include start date" is on (the default). To count a whole month, enter the 1st and the last day.</p>

<h2>Which holidays are skipped</h2>
<p>With the US calendar selected, the calculator skips the 11 federal holidays listed in 5 U.S.C. 6103 on the days federal offices observe them. A holiday on a Saturday is observed on the Friday before and one on a Sunday on the Monday after, which is why July 3, 2026 is skipped. The guide to <a href="/en/guide/federal-holidays-observed/">federal holidays that fall on a weekend</a> lists the observed dates for 2026 to 2028.</p>
<p>Federal holidays are days off for federal employees. State governments and private employers set their own schedules, and state holidays and company closures aren't in the calculator's list, so check which calendar the other side uses.</p>

<h2>Long deadlines over the holidays</h2>
<p>Holidays pile up at the end of the year. Ten business days after Friday, December 18, 2026 is <b>Tuesday, January 5, 2027</b>. Christmas Day and New Year's Day both fall on a Friday and are skipped along with two weekends, so the deadline lands 18 calendar days later.</p>

<h2>When a rule defines "business day" itself</h2>
<p>Some regulations use their own definition, and it doesn't always match Monday to Friday. Under the federal Truth in Lending rules (Regulation Z), the right to cancel certain loans secured by your home counts every calendar day except Sundays and the federal legal holidays. Saturdays count there, and so does an observed holiday such as Friday, July 3, 2026. This calculator always skips Saturdays, so don't use it for those deadlines; read the rule or ask the lender.</p>
""",
        "sources": [
            ("5 U.S.C. 6103, Holidays (Legal Information Institute)", "https://www.law.cornell.edu/uscode/text/5/6103"),
            ("OPM: Federal holidays", "https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/"),
            ("CFPB: Regulation Z, 12 CFR 1026.2(a)(6), definition of business day", "https://www.consumerfinance.gov/rules-policy/regulations/1026/2/"),
            ("CFPB: Official interpretation of 1026.2(a)(6), comment 2 (observed holidays are business days)", "https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-2/"),
        ],
        "related": ["federal-holidays-observed", "days-between-dates", "adding-months"],
    },
    {
        "slug": "federal-holidays-observed",
        "title": "US federal holidays on a weekend: which day is observed",
        "short": "Federal holidays on a weekend",
        "desc": "A federal holiday on a Saturday is observed the Friday before; on a Sunday, the Monday after. Observed dates for 2026 to 2028, including New Year's Day 2028 on Dec 31, 2027.",
        "blurb": "Saturday moves to Friday, Sunday to Monday: dates for 2026–2028",
        "tool": "holidays",
        "cta": "See the US federal holidays for any year",
        "body": """
<p>When a federal holiday falls on a Saturday, most federal employees get the Friday before off. When it falls on a Sunday, they get the Monday after. The Saturday rule is written into 5 U.S.C. 6103(b), and the Sunday rule comes from Executive Order 11582, as the Office of Personnel Management (OPM) explains on its federal holidays page.</p>

<h2>Only five of the 11 holidays can land on a weekend</h2>
<p>The law sets 11 federal holidays. Six are defined as a weekday, such as "the third Monday in January", so they never move. The five with a fixed date can fall on a Saturday or a Sunday.</p>
<table>
<thead><tr><th>Holiday</th><th>Date in the law</th><th>Can fall on a weekend</th></tr></thead>
<tbody>
<tr><td>New Year's Day</td><td>January 1</td><td>Yes</td></tr>
<tr><td>Birthday of Martin Luther King, Jr.</td><td>Third Monday in January</td><td>No</td></tr>
<tr><td>Washington's Birthday</td><td>Third Monday in February</td><td>No</td></tr>
<tr><td>Memorial Day</td><td>Last Monday in May</td><td>No</td></tr>
<tr><td>Juneteenth National Independence Day</td><td>June 19</td><td>Yes</td></tr>
<tr><td>Independence Day</td><td>July 4</td><td>Yes</td></tr>
<tr><td>Labor Day</td><td>First Monday in September</td><td>No</td></tr>
<tr><td>Columbus Day</td><td>Second Monday in October</td><td>No</td></tr>
<tr><td>Veterans Day</td><td>November 11</td><td>Yes</td></tr>
<tr><td>Thanksgiving Day</td><td>Fourth Thursday in November</td><td>No</td></tr>
<tr><td>Christmas Day</td><td>December 25</td><td>Yes</td></tr>
</tbody>
</table>

<h2>Weekend holidays from 2026 to 2028</h2>
<table>
<thead><tr><th>Holiday</th><th>Falls on</th><th>Day off</th></tr></thead>
<tbody>
<tr><td>Independence Day</td><td>Sat, July 4, 2026</td><td>Fri, July 3, 2026</td></tr>
<tr><td>Juneteenth</td><td>Sat, June 19, 2027</td><td>Fri, June 18, 2027</td></tr>
<tr><td>Independence Day</td><td>Sun, July 4, 2027</td><td>Mon, July 5, 2027</td></tr>
<tr><td>Christmas Day</td><td>Sat, Dec 25, 2027</td><td>Fri, Dec 24, 2027</td></tr>
<tr><td>New Year's Day</td><td>Sat, Jan 1, 2028</td><td>Fri, Dec 31, 2027</td></tr>
<tr><td>Veterans Day</td><td>Sat, Nov 11, 2028</td><td>Fri, Nov 10, 2028</td></tr>
</tbody>
</table>
<p>Every other federal holiday in these three years falls on a weekday and is observed on the day itself. These dates match the schedules OPM publishes.</p>

<h2>New Year's Day 2028 is observed in 2027</h2>
<p>Because January 1, 2028 is a Saturday, the day off is Friday, December 31, 2027. That moves a holiday into the previous calendar year. Someone working Monday to Friday gets 12 weekday holidays in 2027 and only 10 in 2028. If you count business days across a year end, look at both years.</p>

<h2>What this means for business-day counts</h2>
<p>Daycount follows the observed dates. With the US calendar selected it skips Friday, July 3, 2026, and Saturday, July 4 is already a weekend, so the week of June 29, 2026 has 4 business days. The holiday list in the calculator shows both the actual date and the observed day. Not every rule works like this: the federal Truth in Lending rules count an observed Friday holiday as a business day, as explained in <a href="/en/guide/business-days/">how to count business days</a>.</p>

<h2>Days that aren't federal holidays</h2>
<ul>
<li><b>Inauguration Day</b> (January 20 every fourth year, next in 2029) is a holiday only for federal employees in the Washington, DC, area, so the calculator doesn't skip it.</li>
<li><b>Election Day</b> and <b>the day after Thanksgiving</b> are not on the federal list.</li>
<li><b>Extra days off by executive order</b> are one-off closures, not legal holidays. Executive Order 14371, for example, was signed on December 18, 2025 and closed federal agencies on December 24 and 26, 2025. The calculator doesn't include these.</li>
<li><b>State holidays</b> are set by each state, and private employers choose their own days off.</li>
</ul>
""",
        "sources": [
            ("OPM: Federal holidays (schedules and the Saturday/Sunday rule)", "https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/"),
            ("5 U.S.C. 6103, Holidays (Legal Information Institute)", "https://www.law.cornell.edu/uscode/text/5/6103"),
            ("Executive Order 14371 (govinfo.gov)", "https://www.govinfo.gov/content/pkg/DCPD-202501210/html/DCPD-202501210.htm"),
        ],
        "related": ["business-days", "days-between-dates", "iso-week-numbers"],
    },
    {
        "slug": "adding-months",
        "title": "Adding months to a date: what happens to January 31",
        "short": "Adding months to a date",
        "desc": "January 31 plus one month is February 28 (29 in a leap year). How the end-of-month rule works, why adding a month twice differs from adding two, and how JavaScript differs.",
        "blurb": "The end-of-month rule and monthly schedules",
        "tool": "add",
        "cta": "Add or subtract months from a date",
        "body": """
<p>If the target month is too short, the date moves back to that month's last day. January 31, 2026 plus one month is <b>February 28, 2026</b>, and in a leap year it's February 29. Daycount works this way, and so do Python's dateutil library and the EDATE function in Microsoft's DAX formula language. JavaScript's built-in <code>Date</code> behaves differently, as shown further down.</p>

<h2>Examples</h2>
<table>
<thead><tr><th>Start</th><th>Change</th><th>Result</th></tr></thead>
<tbody>
<tr><td>Jan 31, 2026</td><td>+1 month</td><td>Feb 28, 2026</td></tr>
<tr><td>Jan 31, 2028</td><td>+1 month</td><td>Feb 29, 2028</td></tr>
<tr><td>Mar 31, 2026</td><td>+1 month</td><td>Apr 30, 2026</td></tr>
<tr><td>Aug 31, 2026</td><td>+6 months</td><td>Feb 28, 2027</td></tr>
<tr><td>Feb 29, 2028</td><td>+12 months</td><td>Feb 28, 2029</td></tr>
<tr><td>Mar 31, 2026</td><td>−1 month</td><td>Feb 28, 2026</td></tr>
</tbody>
</table>
<p>Days 1 to 28 exist in every month, so they never move.</p>

<h2>Adding one month twice isn't adding two months</h2>
<p>Once a date has been pulled back to the 28th, it stays there. January 31 plus one month is February 28, and February 28 plus one month is March 28. But January 31 plus two months is March 31. For anything that repeats monthly, like a bill, a subscription or a payment plan, work out each date from the original start date rather than from the previous due date.</p>
<table>
<thead><tr><th>Payment</th><th>Jan 31, 2026 + n months</th><th>Previous date + 1 month</th></tr></thead>
<tbody>
<tr><td>1</td><td>Feb 28</td><td>Feb 28</td></tr>
<tr><td>2</td><td>Mar 31</td><td>Mar 28</td></tr>
<tr><td>3</td><td>Apr 30</td><td>Apr 28</td></tr>
<tr><td>4</td><td>May 31</td><td>May 28</td></tr>
<tr><td>5</td><td>Jun 30</td><td>Jun 28</td></tr>
</tbody>
</table>
<p>Going backwards has the same catch. March 31 minus one month is February 28, and adding the month back gives March 28, not March 31.</p>

<h2>One month isn't 30 days</h2>
<p>Thirty days after January 31, 2026 is March 2. One month after it is February 28. When a contract says "30 days", put 30 in the Days field of the <a href="/en/#add">date calculator</a>; when it says "one month", use the Months field. Mixing them up can move the date by up to two days.</p>

<h2>Counting the months between two dates</h2>
<p>The same rule decides how many months lie between two dates. Daycount treats a month as complete when the date reaches the same day of the month, or the last day of a shorter month. That makes January 28, 29, 30 and 31, 2026 all exactly one month before February 28, 2026. <a href="/en/guide/exact-age/">Exact age in years, months and days</a> is counted the same way.</p>

<h2>How other tools handle it</h2>
<ul>
<li><b>Python (dateutil)</b>: its documentation says that if the result falls after the last day of the month, the last day is used, and shows January 31, 2003 plus one month as February 28, 2003.</li>
<li><b>Power BI (DAX)</b>: Microsoft documents that <code>EDATE("2009-01-31", 1)</code> returns February 28, 2009.</li>
<li><b>JavaScript</b>: <code>setMonth</code> on a <code>Date</code> carries the extra days into the next month. Starting from January 31, 2026 and setting the month to February gives <b>March 3, 2026</b>. MDN's documentation shows the same effect, with January 31, 2016 becoming March 2, 2016.</li>
</ul>
<p>When two systems disagree by a few days around the end of a month, this difference is the usual reason.</p>
""",
        "sources": [
            ("dateutil documentation: relativedelta", "https://dateutil.readthedocs.io/en/stable/relativedelta.html"),
            ("Microsoft Learn: EDATE function (DAX)", "https://learn.microsoft.com/en-us/dax/edate-function-dax"),
            ("MDN Web Docs: Date.prototype.setMonth()", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setMonth"),
        ],
        "related": ["exact-age", "days-between-dates", "business-days"],
    },
    {
        "slug": "exact-age",
        "title": "How to calculate your exact age in years, months and days",
        "short": "Exact age in years, months and days",
        "desc": "Count whole years to the last birthday, then whole months, then the days left. A worked example, birthdays at the end of a month, February 29 birthdays and age in days.",
        "blurb": "The counting method, month-end and February 29 birthdays",
        "tool": "age",
        "cta": "Calculate exact age from a date of birth",
        "body": """
<p>Count forward from the date of birth: first the whole years up to the last birthday, then the whole months after it, then the days that are left. Someone born on August 15, 1990 is <b>36 years, 1 month and 20 days</b> old on October 5, 2026. Thirty-six years take you to August 15, 2026, one month to September 15, and 20 more days to October 5.</p>

<h2>Step by step</h2>
<ol>
<li><b>Years.</b> Subtract the birth year from the current year: 2026 − 1990 = 36. If this year's birthday hasn't come yet, subtract 1. August 15 has passed, so the answer is 36.</li>
<li><b>Months.</b> Starting from the last birthday (August 15, 2026), count how many times you've passed the 15th. September 15 is one; October 15 hasn't come yet. That's 1 month.</li>
<li><b>Days.</b> Count from the last of those dates (September 15) to today: 20 days.</li>
</ol>

<h2>Birthdays at the end of a month</h2>
<p>Step 2 needs a rule for months that are too short. When the monthly date doesn't exist, Daycount uses the last day of that month, the same rule it uses for <a href="/en/guide/adding-months/">adding months to a date</a>. For someone born on January 31, 2000, the monthly date in February 2026 is February 28, so on March 1, 2026 they are <b>26 years, 1 month and 1 day</b> old.</p>
<p>A common shortcut subtracts the years, months and days separately and "borrows" the length of the previous month when the days go negative. It breaks on a date like this: 1 − 31 + 28 (the days in February 2026) is still negative. Counting forward from the birthday avoids the problem.</p>

<h2>Born on February 29</h2>
<p>In years without a February 29, Daycount treats February 28 as the birthday. A person born on February 29, 2000 is 25 on February 27, 2026 and turns 26 on February 28, 2026. Other rules may use March 1 instead, so for anything official, such as a license or a benefit that starts at a certain age, check the rule that applies.</p>

<h2>Age in days, weeks or months</h2>
<p>The same person, counted up to October 5, 2026:</p>
<table>
<thead><tr><th>Unit</th><th>Born Aug 15, 1990</th></tr></thead>
<tbody>
<tr><td>Days</td><td>13,200 days</td></tr>
<tr><td>Weeks</td><td>1,885 weeks and 5 days</td></tr>
<tr><td>Months</td><td>433 full months</td></tr>
<tr><td>Next birthday</td><td>Aug 15, 2027, in 314 days</td></tr>
</tbody>
</table>
<p>The day count is a plain subtraction, so the day of birth is day 0. A 10,000-days-old celebration falls 10,000 days after the birth date, which for this example was Sunday, December 31, 2017. The <a href="/en/guide/days-between-dates/">guide to counting days between dates</a> explains when to add 1.</p>

<h2>The other rows in the calculator</h2>
<p>Below the main result, the <a href="/en/#age">age calculator</a> also shows two ways of counting age that are used in Korea: the year age (this year minus the birth year) and the traditional Korean age, which starts at 1 and goes up every January 1. You can ignore them unless you need them.</p>
""",
        "sources": [],
        "related": ["adding-months", "days-between-dates", "iso-week-numbers"],
    },
    {
        "slug": "iso-week-numbers",
        "title": "ISO week numbers: why January 1 can be in week 53",
        "short": "ISO week numbers",
        "desc": "ISO weeks start on Monday and week 1 holds the year's first Thursday, so January 1, 2027 is in week 53 of 2026. The rule, 53-week years, and why Excel's WEEKNUM differs.",
        "blurb": "Week 1, week 53 and why spreadsheets disagree",
        "tool": "week",
        "cta": "Look up the ISO week of any date",
        "body": """
<p>In the ISO 8601 system, weeks run from Monday to Sunday and week 1 is the week that contains the year's first Thursday. The first days of January can therefore belong to the last week of the previous year. January 1, 2027 is a Friday and falls in <b>week 53 of 2026</b>; week 1 of 2027 starts on Monday, January 4.</p>

<h2>The rule</h2>
<ul>
<li>A week starts on Monday.</li>
<li>Week 1 is the week with the year's first Thursday in it, which is the same as the week that contains January 4.</li>
<li>A week belongs to the year its Thursday is in, so a week is never split between two years.</li>
</ul>

<h2>Around New Year</h2>
<table>
<thead><tr><th>Date</th><th>ISO week</th></tr></thead>
<tbody>
<tr><td>Mon, Dec 29, 2025</td><td><span class="nw">2026-W01</span></td></tr>
<tr><td>Thu, Jan 1, 2026</td><td><span class="nw">2026-W01</span></td></tr>
<tr><td>Mon, Dec 28, 2026</td><td><span class="nw">2026-W53</span></td></tr>
<tr><td>Fri, Jan 1, 2027</td><td><span class="nw">2026-W53</span></td></tr>
<tr><td>Sun, Jan 3, 2027</td><td><span class="nw">2026-W53</span></td></tr>
<tr><td>Mon, Jan 4, 2027</td><td><span class="nw">2027-W01</span></td></tr>
<tr><td>Mon, Dec 31, 2029</td><td><span class="nw">2030-W01</span></td></tr>
</tbody>
</table>
<p>2026-W53 means week 53 of ISO year 2026. Use the ISO year, not the calendar year, when you label or sort by week, because the two can differ for up to three days at either end of the year. Python's documentation gives a similar case: 2004 began on a Thursday, so ISO week 1 of 2004 started on Monday, December 29, 2003.</p>

<h2>Which years have 53 weeks</h2>
<p>A year has 53 ISO weeks when it starts on a Thursday, or when it's a leap year that starts on a Wednesday. Between 2015 and 2040 that happens in 2015, 2020, 2026, 2032 and 2037. December 28 is always in the last week of its ISO year, so its week number tells you whether a year has 52 or 53 weeks.</p>

<h2>Why a spreadsheet can show a different number</h2>
<p>Excel's <code>WEEKNUM</code> function uses another system by default: the week containing January 1 is week 1, and weeks begin on Sunday. So <code>WEEKNUM</code> puts January 1, 2027 in week 1, while ISO puts it in week 53 of 2026. Microsoft's documentation says <code>WEEKNUM(date, 21)</code> follows ISO 8601 instead and calls it the method "commonly known as the European week numbering system". When you share week numbers with other teams, say which system you mean.</p>

<h2>Week of the month</h2>
<p>The <a href="/en/#week">week number calculator</a> also shows the week of the month. ISO 8601 numbers weeks within a year, not within a month, so Daycount uses a simple convention for this: the week containing the 1st is week 1, and weeks start on Sunday. Monday, October 5, 2026 is in the 2nd week of October and in ISO week 41.</p>
<p>For the number of days between two dates rather than weeks, see <a href="/en/guide/days-between-dates/">how to count the days between two dates</a>.</p>
""",
        "sources": [
            ("Python documentation: date.isocalendar() and the ISO calendar", "https://docs.python.org/3/library/datetime.html#datetime.date.isocalendar"),
            ("Microsoft Support: WEEKNUM function", "https://support.microsoft.com/en-us/office/weeknum-function-e5c43a03-b4ab-426c-b411-b18c13c75340"),
        ],
        "related": ["days-between-dates", "federal-holidays-observed", "adding-months"],
    },
]
GUIDE_BY_SLUG = {g["slug"]: g for g in GUIDES}

# 계산기 페이지 FAQ(영어 검색 질문용으로 새로 씀). 화면과 FAQPage 구조화 데이터가 이 목록 하나에서 나온다
FAQ = [
    ("What does “include start date” mean?",
     "It counts the first day as a day too. From Oct 1 to Oct 3 is 2 days by subtraction, or 3 days if you include the start date. Leave it off for countdowns and “how long ago”; turn it on for periods like “June 1 through June 5”."),
    ("Which days are skipped when counting business days?",
     "Saturdays, Sundays and the public holidays of the calendar you pick. With US holidays, that means the 11 federal holidays on the days they are observed: the Friday before when one falls on a Saturday, the Monday after when it falls on a Sunday. Holiday data covers 2015 to 2035."),
    ("What’s Jan 31 plus one month?",
     "If the next month has no 31st, the result is that month’s last day, so you get Feb 28 (Feb 29 in leap years)."),
    ("How is age calculated?",
     "You gain a year on each birthday, and the months and days are counted on from your last birthday. People born on Feb 29 are treated as having their birthday on Feb 28 in other years."),
    ("Are the dates I enter sent anywhere?",
     "No. Everything is calculated in your browser. Only your holiday calendar and language choices are remembered on this device. Google ads on the page may use cookies (see the <a href=\"/privacy#en\">privacy policy</a>)."),
]


def text_of(fragment):
    return html.unescape(re.sub(r"<[^>]+>", "", fragment))


# ---------------------------------------------------------------- 공통 틀
def head_en(title, desc, path, ld_list, og_type="article", alt=None):
    url = BASE + path
    lds = "".join(f'<script type="application/ld+json">\n{json.dumps(ld, ensure_ascii=False)}\n</script>\n' for ld in ld_list)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta name="theme-color" content="#c2410c" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#8f3210" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="{url}">
{alt or ""}<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Daycount">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="https://date.lumenlab.page/og-en.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Daycount: how many days between two dates">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
{FONT}
<link rel="stylesheet" href="/assets/style.css">
{lds}{AD_HEAD}
"""


HEADER_DOC = """<body class="doc-page">
<a class="skip" href="#main">Skip to content</a>
<header class="top wrap">
  <a class="logo" href="/en/"><span class="logo-mark" aria-hidden="true"><b></b><b></b><b></b></span><span>Daycount</span></a>
  <nav class="top-nav" aria-label="Site menu"><a href="/en/">Calculator</a><a href="/en/guide/">Guides</a><a href="/en/about/">About</a></nav>
</header>
"""


def foot_en(ko_href="/"):
    return f"""<footer class="foot wrap">
  <div class="maker"><svg class="maker-mark" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" opacity=".28"/><circle cx="11" cy="11" r="5"/></svg><p>Daycount is made by <b>Lumen Lab</b>. We make other apps and tools too.</p><a href="https://lumenlab.page/">Visit Lumen Lab →</a></div>
  <p><a href="/en/">Daycount</a> · <a href="/en/guide/">Guides</a> · <a href="/en/about/">About</a> · <a href="/privacy#en">Privacy policy</a> · <a href="mailto:woxocoso@gmail.com">Contact</a> · <a href="{ko_href}" hreflang="ko" lang="ko">한국어</a></p>
  <p>© 2026 Lumen Lab</p>
</footer>
</body>
</html>
"""


# ---------------------------------------------------------------- 글·목록·소개
def guide_page(g):
    path = f"/en/guide/{g['slug']}/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": g["title"], "description": g["desc"], "inLanguage": "en",
         "datePublished": UPDATED, "dateModified": UPDATED, "mainEntityOfPage": BASE + path,
         "author": ORG, "publisher": ORG},
        crumbs([("Daycount", "/en/"), ("Guides", "/en/guide/"), (g["short"], path)])]}
    rel = "".join(f'<li><a href="/en/guide/{s}/">{E(GUIDE_BY_SLUG[s]["title"])}</a></li>' for s in g["related"])
    src = ""
    if g["sources"]:
        src = '\n    <h2>Sources</h2>\n    <ul class="sources">' + "".join(
            f'<li><a href="{E(u)}">{E(n)}</a></li>' for n, u in g["sources"]) + "</ul>"
    return head_en(g["title"] + " | Daycount", g["desc"], path, [ld]) + "</head>\n" + HEADER_DOC + f"""
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/en/">Daycount</a> › <a href="/en/guide/">Guides</a> › <span>{E(g['short'])}</span></nav>
  <article class="doc article">
    <h1>{E(g['title'])}</h1>
    <p class="meta">By Lumen Lab · <time datetime="{UPDATED}">{UPDATED_TEXT}</time></p>
    {g['body'].strip()}
    <p class="cta"><a class="btn" href="/en/#{g['tool']}">{E(g['cta'])} →</a></p>{src}
  </article>
  <section class="related doc" aria-labelledby="rel-h">
    <h2 id="rel-h">Related guides</h2>
    <ul>{rel}</ul>
  </section>
</main>
""" + foot_en()


def guide_list(indent="      "):
    return "\n".join(f'{indent}<li><a href="/en/guide/{g["slug"]}/"><b>{E(g["short"])}</b><span>{E(g["blurb"])}</span></a></li>' for g in GUIDES)


GUIDE_INDEX_TITLE = "Date calculation guides: days, business days, weeks and age | Daycount"
GUIDE_INDEX_DESC = "Plain-English guides to counting days between dates, business days and US federal holidays, adding months, exact age and ISO week numbers, with worked examples."


def guide_index():
    path = "/en/guide/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "name": "Date calculation guides", "url": BASE + path, "inLanguage": "en",
         "hasPart": [{"@type": "Article", "headline": g["title"], "url": f"{BASE}/en/guide/{g['slug']}/"} for g in GUIDES]},
        crumbs([("Daycount", "/en/"), ("Guides", path)])]}
    items = "".join(f'<li><a href="/en/guide/{g["slug"]}/"><b>{E(g["title"])}</b><span>{E(g["desc"])}</span></a></li>' for g in GUIDES)
    return head_en(GUIDE_INDEX_TITLE, GUIDE_INDEX_DESC, path, [ld], og_type="website") + "</head>\n" + HEADER_DOC + f"""
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/en/">Daycount</a> › <span>Guides</span></nav>
  <article class="doc article">
    <h1>Date calculation guides</h1>
    <p>The calculator gives you the number. These guides explain the rules behind it, with examples you can check in the calculator yourself.</p>
    <ul class="guide-list">{items}</ul>
  </article>
</main>
""" + foot_en()


def about_page():
    path = "/en/about/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "AboutPage", "name": "About Daycount", "url": BASE + path, "inLanguage": "en",
         "publisher": dict(ORG, email="woxocoso@gmail.com")},
        crumbs([("Daycount", "/en/"), ("About", path)])]}
    return head_en("About Daycount: who makes it and how it calculates | Daycount",
                   "Daycount is a free date calculator made by Lumen Lab. How it counts days, months, age and business days, where the holiday data comes from, and how to reach us.",
                   path, [ld], og_type="website", alt=alternates("/about/", path)) + "</head>\n" + HEADER_DOC + """
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/en/">Daycount</a> › <span>About</span></nav>
  <article class="doc article">
    <h1>About Daycount</h1>
    <p>Daycount is a free date calculator. It counts the days between two dates, counts down to a date, adds or subtracts days, weeks, months and years, counts business days, finds a date a number of business days away, and works out exact age, anniversaries, the day of the week, ISO week numbers, the time between two moments and the public holidays of a year. There's no sign-up, and the dates you enter are never sent to a server.</p>

    <h2>Who makes it</h2>
    <p>Daycount is made and run by <a href="https://lumenlab.page/">Lumen Lab</a>, a one-person software studio that also makes Owlight, a Mac menu bar app, and SetNote, a workout log web app. The Korean edition of this site is called <a href="/about/" hreflang="ko" lang="ko">며칠 계산기</a>.</p>

    <h2>How it calculates</h2>
    <ul>
      <li><b>Days between dates</b>: the later date minus the earlier one. Turn on “Include start date” to count the first day too.</li>
      <li><b>Months</b>: counted from date to date. If the month is too short, its last day is used, so January 31 plus one month is February 28 (29 in a leap year).</li>
      <li><b>Age</b>: whole years since the last birthday, then months and days. People born on February 29 have their birthday on February 28 in other years.</li>
      <li><b>Business days</b>: Saturdays, Sundays and the holidays of the selected calendar (US federal holidays or Korean public holidays) are skipped, on the days they are observed. When finding a date N business days away, the starting day isn't counted.</li>
      <li><b>Week numbers</b>: ISO 8601. Weeks start on Monday, and week 1 contains the year's first Thursday.</li>
    </ul>

    <h2>Holiday data and accuracy</h2>
    <p>US federal holidays and Korean public holidays for 2015 to 2035 come from the open-source <a href="https://github.com/vacanza/holidays">holidays</a> library. Outside those years only weekends are skipped, and the calculator shows a warning. One-off closures announced later, such as extra days off given by executive order, are not included.</p>
    <p>The date logic is checked by automated tests against more than 3,200 answers computed separately in Python (datetime, dateutil and the holidays library). Results are for planning. For legal deadlines, contracts or payroll, confirm the rule with the organization involved.</p>

    <h2>Advertising</h2>
    <p>The site shows Google AdSense ads to cover its running costs. The <a href="/privacy#en">privacy policy</a> explains the ads and cookies.</p>

    <h2>Contact</h2>
    <p>Found a wrong result or a missing holiday, or want a feature? Email <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>.</p>
  </article>
</main>
""" + foot_en("/about/")


# ---------------------------------------------------------------- 계산기 페이지(index.html → en/index.html)
TOOL_TITLE = "Date Calculator: Days Between Dates, Business Days, Age | Daycount"
TOOL_DESC = "Count the days between two dates, days until a date, business days without US federal holidays, exact age and ISO week numbers. Free, and it runs in your browser."


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def load_en_dict():
    s = read("assets/i18n.js")
    body = s[s.index("var EN = {") + 9: s.index("};", s.index("var EN = {")) + 1]
    body = re.sub(r"^\s*//.*$", "", body, flags=re.M)
    return json.loads(re.sub(r",\s*}", "}", body))


def one(pattern, repl, s, flags=re.S):
    """정확히 한 군데만 바꾼다. index.html 구조가 바뀌어 못 찾으면 멈춘다(조용히 한국어가 남지 않게)."""
    out, n = re.subn(pattern, lambda m: repl(m) if callable(repl) else repl, s, flags=flags)
    if n != 1:
        raise SystemExit(f"build_en: '{pattern[:60]}' 이(가) {n}번 나옴 (1번이어야 함)")
    return out


def faq_html():
    return "\n".join(f"    <details><summary>{E(q, quote=False)}</summary><p>{a}</p></details>" for q, a in FAQ)


def faq_ld():
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": text_of(a)}} for q, a in FAQ]}


def tool_page():
    src = read("index.html")
    en = load_en_dict()
    ko_head = src[src.index("<head>"):src.index("</head>")]
    # 광고 코드·광고 설정은 한국어 페이지와 같게(한쪽만 바뀌면 멈춘다)
    if AD_HEAD not in ko_head or '<script src="assets/ads-config.js"></script>' not in ko_head:
        raise SystemExit("build_en: index.html <head>의 광고 코드가 build_guides.AD_HEAD와 다름")
    body = src[src.index("<body>"):src.index("</html>")]
    body = re.sub(r"[ \t]*<!--.*?-->[ \t]*\n?", "", body, flags=re.S)  # 한국어 주석
    body = one(r'<a class="logo" href="\./">', '<a class="logo" href="/en/">', body)
    body = one(r'<nav class="top-nav".*?</nav>', '<nav class="top-nav" aria-label="Site menu"><a href="/en/guide/">Guides</a><a href="/en/about/">About</a></nav>', body)
    body = one(r'<a class="lang" id="lang"[^>]*>EN</a>', '<a class="lang" id="lang" href="/" hreflang="ko" lang="ko" aria-label="한국어로 보기">한국어</a>', body)
    body = one(r'<ul class="guide-list">.*?</ul>', '<ul class="guide-list">\n' + guide_list() + "\n    </ul>", body)
    body = one(r'(<h2 id="h-faq"[^>]*>[^<]*</h2>\n).*?(\n\s*<div class="ad-slot" data-ad="bottom")', lambda m: m.group(1) + faq_html() + m.group(2), body)
    body = one(r'<footer class="foot wrap">.*?</footer>',
               '<footer class="foot wrap">\n  <div class="maker"><svg class="maker-mark" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" opacity=".28"/><circle cx="11" cy="11" r="5"/></svg><p>Daycount is made by <b>Lumen Lab</b>. We make other apps and tools too.</p><a href="https://lumenlab.page/">Visit Lumen Lab →</a></div>\n  <p><span>© 2026 Lumen Lab</span> · <a href="/en/guide/">Guides</a> · <a href="/en/about/">About</a> · '
               '<a href="/privacy#en">Privacy policy</a> · <a href="mailto:woxocoso@gmail.com">Contact</a></p>\n</footer>', body)
    # 영어 사용자에겐 '시작한 날을 1일째로(한국식)'를 기본으로 끈다: 100일 = 시작일 + 100일
    body = one(r'<input type="checkbox" id="an-one" checked>', '<input type="checkbox" id="an-one">', body)
    body = body.replace('src="assets/', 'src="/assets/')

    def tr(m):
        tag, before, key, after = m.group(1), m.group(2), html.unescape(m.group(3)), m.group(4)
        if key not in en:
            raise SystemExit("build_en: 영어 사전에 없음: " + key)
        return f"<{tag}{before}{after}>{E(en[key], quote=False)}</{tag}>"
    body = re.sub(r'<(\w+)([^>]*?) data-i18n="([^"]+)"([^>]*)>[^<]*</\1>', tr, body)
    body = re.sub(r'aria-label="[^"]*" data-i18n-aria="([^"]+)"', lambda m: f'aria-label="{E(en[html.unescape(m.group(1))])}"', body)
    if "data-i18n" in body:
        raise SystemExit("build_en: 못 바꾼 data-i18n이 남음")

    app = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Daycount", "url": BASE + "/en/",
           "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "inLanguage": "en",
           "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
           "description": "Free web calculator for days between dates, countdowns, business days, exact age, anniversaries, day of the week and ISO week numbers"}
    head = head_en(TOOL_TITLE, TOOL_DESC, "/en/", [app, faq_ld()], og_type="website", alt=alternates("/", "/en/"))
    head = head.replace('<meta property="og:locale" content="en_US">\n', '<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="ko_KR">\n')
    head += '<script src="/assets/ads-config.js"></script>\n</head>\n'
    return head + body + "</html>\n"


# ---------------------------------------------------------------- 한글 검사(빌드와 tools/check_en.py가 같이 씀)
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class _LangScan(HTMLParser):
    """lang="ko"(와 그 안) 밖에 한글이 있으면 모은다. 글자·속성값·주석·스크립트(JSON-LD) 모두 본다."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.bad = [], []

    def _cur(self, own=None):
        if own:
            return own
        for _, l in reversed(self.stack):
            if l:
                return l
        return ""

    def _check_attrs(self, tag, attrs):
        lang = dict(attrs).get("lang")
        if not self._cur(lang).startswith("ko"):
            for k, v in attrs:
                if v and HANGUL.search(v):
                    self.bad.append(f"<{tag} {k}=\"{v[:50]}\">")
        return lang

    def handle_starttag(self, tag, attrs):
        lang = self._check_attrs(tag, attrs)
        if tag not in VOID:
            self.stack.append((tag, lang))

    def handle_startendtag(self, tag, attrs):
        self._check_attrs(tag, attrs)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if HANGUL.search(data) and not self._cur().startswith("ko"):
            self.bad.append(data.strip()[:60])

    def handle_comment(self, data):
        if HANGUL.search(data):
            self.bad.append("<!--" + data.strip()[:50])


def hangul_outside_ko(text):
    p = _LangScan()
    p.feed(text)
    p.close()
    return p.bad


# ---------------------------------------------------------------- 만들기
def pages():
    """영어 페이지 전부: {파일 경로: 내용}"""
    out = {"en/index.html": tool_page(), "en/guide/index.html": guide_index(), "en/about/index.html": about_page()}
    for g in GUIDES:
        out[f"en/guide/{g['slug']}/index.html"] = guide_page(g)
    return out


def urls():
    """sitemap에 넣을 영어 주소(대표 주소만)."""
    return ["/en/", "/en/guide/"] + [f"/en/guide/{g['slug']}/" for g in GUIDES] + ["/en/about/"]


def build_all():
    made = pages()
    for path, text in made.items():
        bad = hangul_outside_ko(text)
        if bad:
            raise SystemExit(f"build_en: {path} 에 lang=\"ko\" 밖 한글: {bad[:5]}")
        write(path, text)
    return len(GUIDES)


if __name__ == "__main__":
    raise SystemExit("python3 date-calc/tools/build_guides.py 로 돌린다(한국어·영어를 한 번에 만든다)")
