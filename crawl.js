import { load } from 'cheerio';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const BASE_URL = 'https://claude.com';
const PLUGINS_URL = `${BASE_URL}/plugins`;
const DETAIL_DELAY_MS = 300;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
  return res.text();
}

function parsePlugins(html) {
  const $ = load(html);
  const plugins = [];

  $('.stories_cms_item.w-dyn-item').each((_, item) => {
    const card = $(item).find('a.connector_cms_pill[href^="/plugins/"]').first();
    if (!card.length) return;

    const href = card.attr('href');
    const slug = href.replace('/plugins/', '');
    const name = card.find('[fs-list-field="name"]').text().trim();
    const summary = card.find('p.u-text-style-caption.u-foreground-tertiary').first().text().trim();

    let installCount = null;
    card.find('*').each((_, node) => {
      const text = $(node).clone().children().remove().end().text().trim();
      if (/^[\d,]+$/.test(text) && installCount === null) {
        installCount = parseInt(text.replace(/,/g, ''), 10);
      }
    });

    const isAnthropicVerified = card.text().includes('Anthropic verified');

    const worksWith = [];
    $(item).find('.u-display-none .w-dyn-item').each((_, el) => {
      const text = $(el).text().trim();
      if (text) worksWith.push(text);
    });

    plugins.push({ name, slug, url: `${BASE_URL}${href}`, summary, installCount, isAnthropicVerified, worksWith });
  });

  return plugins;
}

function parseDetail(html) {
  const $ = load(html);

  // 상세 설명 전문
  const description = $('.w-richtext').text().trim() || null;

  // hero 상세 항목 (Made by, Install in, Installs)
  let madeBy = null;
  let installIn = null;
  let installCount = null;
  let isAnthropicVerified = false;

  $('.hero_connector_details_item').each((_, item) => {
    const text = $(item).find('.hero_connector_details_content').text().trim();
    if (text.startsWith('Made by')) madeBy = text.replace('Made by', '').trim();
    else if (text.startsWith('Install in')) installIn = text.replace('Install in', '').trim();
    else if (text.startsWith('Installs')) installCount = parseInt(text.replace('Installs', '').replace(/,/g, '').trim(), 10);
    else if (text.includes('Verified')) isAnthropicVerified = true;
  });

  return { description, madeBy, installIn, installCount, isAnthropicVerified };
}

function getTotalPages(html) {
  const $ = load(html);
  const pageText = $('*').filter((_, el) => /\d+\s*\/\s*\d+/.test($(el).text())).first().text();
  const match = pageText.match(/\d+\s*\/\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function loadExisting() {
  if (!existsSync('plugins.json')) return { plugins: [], slugSet: new Set() };
  const data = JSON.parse(readFileSync('plugins.json', 'utf-8'));
  const slugSet = new Set(data.plugins.map(p => p.slug));
  console.log(`기존 plugins.json: ${data.plugins.length}개 로드`);
  return { plugins: data.plugins, slugSet };
}

async function crawl() {
  const { plugins: existing, slugSet } = loadExisting();

  // 1단계: 목록 페이지 크롤링
  console.log('\n── 1단계: 목록 페이지 크롤링 ──');
  console.log('1페이지 크롤링 중...');
  const firstHtml = await fetchHtml(PLUGINS_URL);
  const totalPages = getTotalPages(firstHtml);
  console.log(`총 ${totalPages}페이지 발견`);

  let allPlugins = parsePlugins(firstHtml);
  console.log(`1페이지: ${allPlugins.length}개`);

  for (let page = 2; page <= totalPages; page++) {
    console.log(`${page}페이지 크롤링 중...`);
    const html = await fetchHtml(`${PLUGINS_URL}?cc61befa_page=${page}`);
    const plugins = parsePlugins(html);
    if (plugins.length === 0) break;
    console.log(`${page}페이지: ${plugins.length}개`);
    allPlugins = allPlugins.concat(plugins);
  }

  // 중복 제거 + Claude Code 필터링
  const seen = new Set();
  const unique = allPlugins.filter(p => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
  const claudeCodePlugins = unique.filter(p => p.worksWith.includes('Claude Code'));
  console.log(`\n전체: ${unique.length}개 / Claude Code: ${claudeCodePlugins.length}개`);

  // 2단계: 신규 플러그인만 상세 크롤링
  const newPlugins = claudeCodePlugins.filter(p => !slugSet.has(p.slug));
  console.log(`\n── 2단계: 상세 페이지 크롤링 ──`);
  console.log(`신규: ${newPlugins.length}개 / 기존(스킵): ${claudeCodePlugins.length - newPlugins.length}개`);

  const enriched = [];
  for (let i = 0; i < newPlugins.length; i++) {
    const plugin = newPlugins[i];
    process.stdout.write(`[${i + 1}/${newPlugins.length}] ${plugin.name} ...`);
    try {
      const html = await fetchHtml(plugin.url);
      const detail = parseDetail(html);
      enriched.push({
        ...plugin,
        description: detail.description,
        madeBy: detail.madeBy,
        installIn: detail.installIn,
        installCount: detail.installCount ?? plugin.installCount,
        isAnthropicVerified: detail.isAnthropicVerified || plugin.isAnthropicVerified,
      });
      console.log(' 완료');
    } catch (err) {
      console.log(` 실패: ${err.message}`);
      enriched.push(plugin);
    }
    if (i < newPlugins.length - 1) {
      await new Promise(r => setTimeout(r, DETAIL_DELAY_MS));
    }
  }

  const merged = [...existing, ...enriched];
  const output = {
    crawledAt: new Date().toISOString(),
    total: merged.length,
    plugins: merged,
  };

  writeFileSync('plugins.json', JSON.stringify(output, null, 2), 'utf-8');
  if (newPlugins.length === 0) {
    console.log('\n새로 추가된 플러그인 없음. plugins.json 유지');
  } else {
    console.log(`\n완료! 신규 ${enriched.length}개 추가 → 총 ${merged.length}개 → plugins.json 저장`);
  }
}

crawl().catch(err => {
  console.error('크롤링 실패:', err.message);
  process.exit(1);
});
