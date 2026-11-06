/**
 * 便签墙 · 浏览器半侧
 *
 * 左侧边栏常驻一个入口（slot `sidebar.panellist`），点开后在 main 面板渲染
 * 一整面便签墙（slot `main`）：
 *   - 顶部一张暖黄色「便签纸」输入卡：写一句，⌘/Ctrl+Enter 或点「贴上墙」；
 *   - 六个纸色圆点、可选分类小标题；
 *   - 墙上每张便签有分类小标题、正文、相对时间和一行小操作（置顶 / 换色 / 撕掉）；
 *   - 搜索框即时过滤；置顶在前，其次最近改动；
 *   - 数据经 Host 路由读写，保存在本机 JSON 文件里，刷新/重启不丢。
 *
 * 页面骨架用宿主主题 token；便签纸本身是「作品」，用固定粉彩纸色 + 深色墨字，
 * 亮色/暗色主题下都像一张真实的彩色便签。
 */

window.__ModuleLoader__.load({
  id: 'dsh-sticky-wall',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-sticky-wall';
    const PANEL_ID = 'dsh-sticky-wall';
    const API = '/dsh-sticky-wall/api/notes';
    const COLORS = ['amber', 'peach', 'rose', 'coral', 'sky', 'mint', 'lime', 'violet', 'plain'];

    const zh = {
      panel: '便签墙',
      kicker: '便签墙',
      title: '便签墙',
      subtitle: '记下每个想法，自动保存在本机',
      count: '{n} 张便签',
      countEmpty: '还没有便签',
      archiveCount: '{n} 张已归档',
      archiveSubtitle: '收起来的便签，随时可以取回',
      archiveView: '归档 {n}',
      backToWall: '返回便签墙',
      archive: '归档',
      unarchive: '取出归档',
      filterLabel: '按分类筛选',
      filterAll: '全部',
      uncategorized: '未分类',
      today: '今天',
      thisWeek: '本周',
      earlier: '更早',
      expand: '展开 {n} 张',
      collapse: '收起',
      emptyArchiveTitle: '归档里还没有便签',
      emptyArchiveBody: '在便签卡上点归档，暂时不看的便签会收在这里。',
      composerPlaceholder: '记下你的下一个想法…',
      categoryPlaceholder: '分类（可选）',
      todoToggle: '待办',
      composerTodoPlaceholder: '一行一个待办，换行就是下一条…',
      editTodoHint: '一行一个待办',
      todo: '待办',
      progress: '{done}/{total}',
      composerHint: '⌘/Ctrl + Enter',
      add: '贴上墙',
      adding: '正在贴…',
      search: '搜索便签',
      searchClear: '清空搜索',
      color: '换一种纸色',
      pin: '置顶',
      unpin: '取消置顶',
      remove: '撕掉',
      save: '保存',
      cancel: '取消',
      editKicker: '分类',
      emptyTitle: '墙上还没有便签',
      emptyBody: '在上面写一句，按 ⌘/Ctrl + Enter，第一张便签就贴上了。',
      emptySearchTitle: '没有找到匹配的便签',
      emptySearchBody: '换个词试试，或清空搜索。',
      errorTitle: '便签墙暂时读不到',
      errorBody: 'Host 路由没有响应，刷新页面或稍后重试。',
      retry: '重试',
      loading: '正在取便签…',
      justNow: '刚刚',
      minutesAgo: '{n} 分钟前',
      hoursAgo: '{n} 小时前',
      yesterday: '昨天',
      color_amber: '暖黄',
      color_peach: '蜜桃橙',
      color_rose: '樱花粉',
      color_coral: '珊瑚红',
      color_sky: '天蓝',
      color_mint: '薄荷绿',
      color_lime: '嫩绿',
      color_violet: '淡紫',
      color_plain: '燕麦',
      addFailed: '没贴上：{message}',
      saveFailed: '没保存：{message}',
      removeFailed: '没撕掉：{message}',
      noteRemoved: '已撕掉一张便签',
      undo: '撤销',
    };

    const en = {
      panel: 'Sticky notes',
      kicker: 'Sticky notes',
      title: 'Sticky Wall',
      subtitle: 'Capture every idea. Your notes save automatically.',
      count: '{n} notes',
      countEmpty: 'No notes yet',
      archiveCount: '{n} archived',
      archiveSubtitle: 'Notes you put away — restore them anytime.',
      archiveView: 'Archive {n}',
      backToWall: 'Back to the wall',
      archive: 'Archive',
      unarchive: 'Restore',
      filterLabel: 'Filter by category',
      filterAll: 'All',
      uncategorized: 'Uncategorised',
      today: 'Today',
      thisWeek: 'This week',
      earlier: 'Earlier',
      expand: 'Show {n}',
      collapse: 'Collapse',
      emptyArchiveTitle: 'Nothing archived yet',
      emptyArchiveBody: 'Archive a note when you want it off the wall but still around.',
      composerPlaceholder: 'Write down your next idea…',
      categoryPlaceholder: 'Category',
      todoToggle: 'To-do',
      composerTodoPlaceholder: 'One to-do per line — Enter starts the next…',
      editTodoHint: 'One to-do per line',
      todo: 'To-do',
      progress: '{done}/{total}',
      composerHint: '⌘/Ctrl + Enter',
      add: 'Add to wall',
      adding: 'Adding…',
      search: 'Search notes',
      searchClear: 'Clear search',
      color: 'Change paper colour',
      pin: 'Pin',
      unpin: 'Unpin',
      remove: 'Tear off',
      save: 'Save',
      cancel: 'Cancel',
      editKicker: 'Category',
      emptyTitle: 'The wall is empty',
      emptyBody: 'Write a line above and press ⌘/Ctrl + Enter — the first note lands here.',
      emptySearchTitle: 'No notes match',
      emptySearchBody: 'Try another word, or clear the search.',
      errorTitle: 'The wall is out of reach',
      errorBody: 'The host route did not answer. Refresh the page or try again.',
      retry: 'Retry',
      loading: 'Fetching notes…',
      justNow: 'just now',
      minutesAgo: '{n} min ago',
      hoursAgo: '{n} h ago',
      yesterday: 'yesterday',
      color_amber: 'Amber',
      color_peach: 'Peach',
      color_rose: 'Rose',
      color_coral: 'Coral',
      color_sky: 'Sky',
      color_mint: 'Mint',
      color_lime: 'Lime',
      color_violet: 'Lilac',
      color_plain: 'Oat',
      addFailed: 'Not stuck: {message}',
      saveFailed: 'Not saved: {message}',
      removeFailed: 'Not torn off: {message}',
      noteRemoved: 'Note torn off',
      undo: 'Undo',
    };

    const STYLE = [
      /* 页面骨架 —— 只吃宿主主题 token */
      '.dsh-sticky-wall-root{height:100%;min-height:0;overflow:auto;box-sizing:border-box;',
      'background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);',
      'font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}',
      '.dsh-sticky-wall-inner{max-width:1120px;margin:0 auto;padding:22px 26px 64px}',
      '.dsh-sticky-wall-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin:0 2px 18px}',
      '.dsh-sticky-wall-heading h1{margin:0;font-size:20px;line-height:1.3;font-weight:600;letter-spacing:.01em;',
      'color:var(--dsw-alias-label-primary)}',
      '.dsh-sticky-wall-subtitle{margin:5px 0 0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);opacity:.95}',
      '.dsh-sticky-wall-topright{display:flex;align-items:center;gap:12px;flex:1 1 auto;justify-content:flex-end;min-width:0;padding-top:3px}',
      '.dsh-sticky-wall-count{font-size:11.5px;color:var(--dsw-alias-label-secondary);opacity:.85;white-space:nowrap}',
      '.dsh-sticky-wall-search{position:relative;display:flex;align-items:center}',
      '.dsh-sticky-wall-search svg{position:absolute;left:8px;color:var(--dsw-alias-label-secondary);pointer-events:none;opacity:.8}',
      '.dsh-sticky-wall-search input{width:186px;height:30px;box-sizing:border-box;padding:0 9px 0 26px;border-radius:8px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;',
      'font:inherit;font-size:12px;outline:none;transition:border-color .15s ease,box-shadow .15s ease}',
      '.dsh-sticky-wall-search input:focus{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-border-l1));',
      'box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}',
      '.dsh-sticky-wall-search input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.75}',

      /* 暖黄便签纸输入卡 —— 纸色是作品色，固定粉彩 + 深墨字 */
      '.dsh-sticky-wall-composer{position:relative;box-sizing:border-box;border-radius:18px;background:#FDE8A9;color:#3F3520;',
      'padding:16px 18px 12px;box-shadow:0 1px 0 rgba(63,53,32,.05),0 14px 30px rgba(63,53,32,.09)}',
      '.dsh-sticky-wall-composer textarea{display:block;width:100%;min-height:88px;max-height:300px;box-sizing:border-box;resize:vertical;',
      'border:0;padding:0;margin:0;background:transparent;color:#3F3520;font:inherit;font-size:14px;line-height:1.6;outline:none}',
      '.dsh-sticky-wall-composer textarea::placeholder{color:#8A7434;opacity:.95}',
      '.dsh-sticky-wall-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}',
      '.dsh-sticky-wall-swatches{display:flex;align-items:center;gap:7px}',
      '.dsh-sticky-wall-swatch{appearance:none;position:relative;width:14px;height:14px;padding:0;border-radius:50%;cursor:pointer;',
      'border:1px solid rgba(63,53,32,.14);background:var(--swatch);transition:transform .12s ease,box-shadow .12s ease}',
      '.dsh-sticky-wall-swatch:hover{transform:scale(1.14)}',
      '.dsh-sticky-wall-swatch[aria-pressed="true"]{box-shadow:0 0 0 2px #FDE8A9,0 0 0 3.5px rgba(63,53,32,.55)}',
      '.dsh-sticky-wall-swatch:focus-visible{outline:2px solid #3F3520;outline-offset:2px}',
      '.dsh-sticky-wall-swatch[data-tint="amber"]{--swatch:#FDE8A9}',
      '.dsh-sticky-wall-swatch[data-tint="peach"]{--swatch:#FBD7B2}',
      '.dsh-sticky-wall-swatch[data-tint="rose"]{--swatch:#F8C9D1}',
      '.dsh-sticky-wall-swatch[data-tint="coral"]{--swatch:#F6C0B8}',
      '.dsh-sticky-wall-swatch[data-tint="sky"]{--swatch:#BBD9F6}',
      '.dsh-sticky-wall-swatch[data-tint="mint"]{--swatch:#C1E8E3}',
      '.dsh-sticky-wall-swatch[data-tint="lime"]{--swatch:#DDEAB0}',
      '.dsh-sticky-wall-swatch[data-tint="violet"]{--swatch:#DAD2F7}',
      '.dsh-sticky-wall-swatch[data-tint="plain"]{--swatch:#F0E1BF}',
      '.dsh-sticky-wall-category{appearance:none;flex:none;width:124px;height:22px;box-sizing:border-box;border:0;padding:0 2px;',
      'background:transparent;color:#3F3520;font:inherit;font-size:10.5px;font-weight:600;letter-spacing:.1em;',
      'text-transform:uppercase;outline:none;border-bottom:1px solid transparent;transition:border-color .15s ease}',
      '.dsh-sticky-wall-category::placeholder{color:#8A7434;opacity:.85;font-weight:500;letter-spacing:.06em;text-transform:none}',
      '.dsh-sticky-wall-category:focus{border-bottom-color:rgba(63,53,32,.35)}',
      '.dsh-sticky-wall-todo-toggle{appearance:none;flex:none;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;',
      'border-radius:6px;border:1px solid rgba(63,53,32,.22);background:transparent;color:#6B5327;',
      'font:inherit;font-size:10.5px;font-weight:600;cursor:pointer;transition:background .12s ease,color .12s ease,border-color .12s ease}',
      '.dsh-sticky-wall-todo-toggle:hover:not([aria-pressed="true"]){background:rgba(63,53,32,.08)}',
      '.dsh-sticky-wall-todo-toggle[aria-pressed="true"]{background:#6B5327;border-color:#6B5327;color:#FFF7E6}',
      '.dsh-sticky-wall-todo-toggle:focus-visible{outline:2px solid #3F3520;outline-offset:2px}',
      '.dsh-sticky-wall-spacer{flex:1 1 auto}',
      '.dsh-sticky-wall-hint{font-size:10.5px;color:#8A7434;white-space:nowrap;opacity:.95;user-select:none}',
      '.dsh-sticky-wall-add{appearance:none;flex:none;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 16px;',
      'margin-left:2px;border:0;border-radius:999px;background:#6B5327;color:#FFF7E6;cursor:pointer;',
      'font:inherit;font-size:12px;font-weight:600;letter-spacing:.01em;transition:background .15s ease,opacity .15s ease,transform .1s ease}',
      '.dsh-sticky-wall-add:hover:not(:disabled){background:#5A451F}',
      '.dsh-sticky-wall-add:active:not(:disabled){transform:translateY(.5px)}',
      '.dsh-sticky-wall-add:disabled{opacity:.45;cursor:default}',
      '.dsh-sticky-wall-add:focus-visible{outline:2px solid #3F3520;outline-offset:2px}',

      /* 提示条 */
      '.dsh-sticky-wall-notice{display:flex;align-items:center;gap:10px;margin-top:12px;padding:8px 12px;border-radius:9px;font-size:12px;',
      'border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l1));',
      'background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,var(--dsw-alias-bg-layer-1));',
      'color:var(--dsw-alias-label-primary)}',
      '.dsh-sticky-wall-notice button{appearance:none;margin-left:auto;border:0;background:transparent;color:inherit;',
      'font:inherit;font-size:11.5px;cursor:pointer;opacity:.8}',
      '.dsh-sticky-wall-notice button:hover{opacity:1}',
      '.dsh-sticky-wall-notice--undo{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 38%,var(--dsw-alias-border-l1));',
      'background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-1))}',
      '.dsh-sticky-wall-notice--undo button{font-size:12px;text-decoration:underline}',
      '.dsh-sticky-wall-notice-close{font-size:15px!important;line-height:1;text-decoration:none!important;opacity:.7;margin-left:4px!important}',

      /* 便签墙 */
      /* 分类筛选 */
      '.dsh-sticky-wall-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:18px}',
      '.dsh-sticky-wall-chip{appearance:none;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:999px;',
      'border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:11.5px;cursor:pointer;transition:background .12s ease,border-color .12s ease,color .12s ease}',
      '.dsh-sticky-wall-chip:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsh-sticky-wall-chip.is-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,var(--dsw-alias-bg-layer-1));',
      'border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l1));color:var(--dsw-alias-label-primary)}',
      '.dsh-sticky-wall-chip-count{font-size:10.5px;opacity:.65}',
      '.dsh-sticky-wall-chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',

      /* 时间分区 */
      '.dsh-sticky-wall-section{margin-top:24px}',
      '.dsh-sticky-wall-section-head{display:flex;align-items:center;gap:8px;margin:0 3px 10px}',
      '.dsh-sticky-wall-section-label{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;',
      'color:var(--dsw-alias-label-secondary);opacity:.9}',
      '.dsh-sticky-wall-section-count{font-size:10.5px;color:var(--dsw-alias-label-secondary);opacity:.6}',
      '.dsh-sticky-wall-section-toggle{appearance:none;margin-left:auto;border:0;background:transparent;',
      'color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;padding:2px 0;opacity:.85}',
      '.dsh-sticky-wall-section-toggle:hover{opacity:1;text-decoration:underline}',
      '.dsh-sticky-wall-section .dsh-sticky-wall-wall{margin-top:0}',

      /* 归档入口 */
      '.dsh-sticky-wall-archivebtn{appearance:none;flex:none;display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 11px;',
      'border-radius:8px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);',
      'background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:11.5px;white-space:nowrap;transition:background .12s ease,color .12s ease,border-color .12s ease}',
      '.dsh-sticky-wall-archivebtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-sticky-wall-archivebtn.is-active{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}',

      /* 便签墙 —— 每行三张、卡片更高；角度由 id 派生，像手贴上去的 */
      '.dsh-sticky-wall-wall{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:24px;align-items:start}',
      '.dsh-note{--paper:#FDE8A9;--ink:#3F3520;--soft:#8A7434;position:relative;display:flex;flex-direction:column;',
      'min-height:156px;box-sizing:border-box;border-radius:16px;background:var(--paper);color:var(--ink);',
      'padding:16px 18px 14px;box-shadow:0 1px 2px rgba(30,26,18,.05),0 3px 10px rgba(30,26,18,.035);',
      'transform:translateY(var(--y,0px)) rotate(var(--rot,0deg));',
      'transition:transform .18s ease,box-shadow .18s ease}',
      '.dsh-note:hover,.dsh-note:focus-within{transform:translateY(-2px) rotate(0deg);',
      'box-shadow:0 12px 26px rgba(30,26,18,.11),0 2px 5px rgba(30,26,18,.05)}',
      '.dsh-note[data-tint="peach"]{--paper:#FBD7B2;--ink:#402F1D;--soft:#91703F}',
      '.dsh-note[data-tint="rose"]{--paper:#F8C9D1;--ink:#40252B;--soft:#9A5C68}',
      '.dsh-note[data-tint="coral"]{--paper:#F6C0B8;--ink:#402420;--soft:#9C5A50}',
      '.dsh-note[data-tint="sky"]{--paper:#BBD9F6;--ink:#1F3245;--soft:#4F7195}',
      '.dsh-note[data-tint="mint"]{--paper:#C1E8E3;--ink:#1E3A36;--soft:#3F7A73}',
      '.dsh-note[data-tint="lime"]{--paper:#DDEAB0;--ink:#30381C;--soft:#6E7A3E}',
      '.dsh-note[data-tint="violet"]{--paper:#DAD2F7;--ink:#2D2645;--soft:#6A5C9B}',
      '.dsh-note[data-tint="plain"]{--paper:#F0E1BF;--ink:#3A3020;--soft:#7E6C4A}',
      '.dsh-note-kicker{font-size:9.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--soft);',
      'margin-bottom:8px;min-height:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;user-select:none}',
      '.dsh-note-body{flex:1 1 auto;margin:0 0 14px;font-size:14.5px;font-weight:500;line-height:1.5;',
      'white-space:pre-wrap;overflow-wrap:anywhere;cursor:text}',
      '.dsh-note-kicker-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
      '.dsh-note-kicker-row .dsh-note-kicker{margin-bottom:0;min-height:0;flex:0 1 auto}',
      '.dsh-note-progress{margin-left:auto;font-size:9px;font-weight:600;letter-spacing:.08em;color:var(--soft);',
      'opacity:.9;white-space:nowrap;user-select:none}',
      '.dsh-note-todos{display:flex;flex-direction:column;gap:5px;flex:1 1 auto;margin:0 0 12px}',
      '.dsh-note-todo{display:flex;align-items:flex-start;gap:8px;width:100%;text-align:left}',
      '.dsh-note-check{appearance:none;flex:none;display:grid;place-items:center;width:15px;height:15px;margin:2px 0 0;padding:0;',
      'border-radius:4px;border:1.4px solid var(--soft);background:transparent;color:transparent;cursor:pointer}',
      '.dsh-note-check[aria-checked="true"]{background:var(--ink);border-color:var(--ink);color:var(--paper)}',
      '.dsh-note-check:focus-visible{outline:2px solid var(--ink);outline-offset:1px}',
      '.dsh-note-todo-text{flex:1 1 auto;font-size:14px;font-weight:500;line-height:1.4;white-space:pre-wrap;',
      'overflow-wrap:anywhere;cursor:text}',
      '.dsh-note-todo-text.is-done{opacity:.5;text-decoration:line-through}',
      '.dsh-note-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:20px}',
      '.dsh-note-time{font-size:9px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--soft);',
      'opacity:.9;user-select:none;white-space:nowrap}',
      '.dsh-note-actions{display:flex;align-items:center;gap:1px;opacity:.5;transition:opacity .13s ease}',
      '.dsh-note:hover .dsh-note-actions,.dsh-note:focus-within .dsh-note-actions,.dsh-note.is-pinned .dsh-note-actions{opacity:1}',
      '.dsh-note-btn{appearance:none;display:inline-grid;place-items:center;width:20px;height:20px;padding:0;border:0;',
      'border-radius:5px;background:transparent;color:var(--soft);cursor:pointer;opacity:.9;',
      'transition:background .12s ease,color .12s ease,opacity .12s ease}',
      '.dsh-note-btn:hover{background:rgba(30,26,18,.09);color:var(--ink);opacity:1}',
      '.dsh-note-btn:focus-visible{outline:2px solid var(--ink);outline-offset:1px}',
      '.dsh-note-btn.is-on{color:var(--ink);opacity:1}',
      '.dsh-note-btn:disabled{opacity:.35;cursor:default}',
      '.dsh-note-edit{display:flex;flex-direction:column;gap:8px;flex:1 1 auto}',
      '.dsh-note-edit-category{appearance:none;width:100%;box-sizing:border-box;border:0;border-bottom:1px solid rgba(63,53,32,.2);',
      'padding:0 0 3px;background:transparent;color:var(--ink);font:inherit;font-size:9px;font-weight:700;letter-spacing:.12em;',
      'text-transform:uppercase;outline:none}',
      '.dsh-note-edit-category::placeholder{color:var(--soft);font-weight:600;opacity:.75;letter-spacing:.06em;text-transform:none}',
      '.dsh-note-edit-head{display:flex;align-items:center;gap:8px}',
      '.dsh-note-edit-head .dsh-note-edit-category{flex:1 1 auto;width:auto;min-width:0}',
      '.dsh-note-kind{appearance:none;flex:none;display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;',
      'border-radius:6px;border:1px solid rgba(63,53,32,.2);background:rgba(255,255,255,.35);color:var(--ink);',
      'font:inherit;font-size:9.5px;font-weight:700;letter-spacing:.06em;cursor:pointer}',
      '.dsh-note-kind[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--paper)}',
      '.dsh-note-kind:focus-visible{outline:2px solid var(--ink);outline-offset:1px}',
      '.dsh-note-edit textarea{width:100%;min-height:88px;box-sizing:border-box;resize:vertical;border-radius:8px;padding:8px 9px;',
      'border:1px solid rgba(63,53,32,.18);background:rgba(255,255,255,.42);color:var(--ink);font:inherit;font-size:13px;',
      'line-height:1.45;outline:none}',
      '.dsh-note-edit textarea:focus{border-color:rgba(63,53,32,.4);background:rgba(255,255,255,.6)}',
      '.dsh-note-edit-actions{display:flex;gap:6px;justify-content:flex-end}',
      '.dsh-note-edit-actions button{appearance:none;height:24px;padding:0 10px;border-radius:6px;cursor:pointer;',
      'font:inherit;font-size:11px;font-weight:600;border:1px solid rgba(63,53,32,.2);background:rgba(255,255,255,.35);color:var(--ink)}',
      '.dsh-note-edit-actions button:hover{background:rgba(255,255,255,.6)}',
      '.dsh-note-edit-actions button[data-primary="true"]{background:#6B5327;border-color:#6B5327;color:#FFF7E6}',
      '.dsh-note-edit-actions button[data-primary="true"]:hover{background:#5A451F}',

      /* 空态 / 加载 / 错误 */
      '.dsh-sticky-wall-empty{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:20px;padding:52px 20px;text-align:center;',
      'border:1px dashed color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent);border-radius:16px}',
      '.dsh-sticky-wall-empty strong{font-size:13.5px;font-weight:600}',
      '.dsh-sticky-wall-empty span{font-size:12.5px;color:var(--dsw-alias-label-secondary);max-width:36ch}',
      '.dsh-sticky-wall-empty button{margin-top:10px}',
      '.dsh-sticky-wall-loading{display:flex;align-items:center;gap:8px;margin-top:24px;padding:28px 4px;',
      'color:var(--dsw-alias-label-secondary);font-size:12.5px}',
      '.dsh-sticky-wall-dots{display:inline-flex;gap:3px}',
      '.dsh-sticky-wall-dot{width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-brand-primary);opacity:.35;',
      'animation:dsh-sticky-wall-bounce 1.05s ease-in-out infinite}',
      '.dsh-sticky-wall-dot:nth-child(2){animation-delay:.14s}',
      '.dsh-sticky-wall-dot:nth-child(3){animation-delay:.28s}',
      '@keyframes dsh-sticky-wall-bounce{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}',
      '.dsh-sticky-wall-retry{appearance:none;height:28px;padding:0 14px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
      '.dsh-sticky-wall-retry:hover{background:var(--dsw-alias-bg-layer-2)}',
      '@media (max-width:640px){.dsh-sticky-wall-wall{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
      '.dsh-sticky-wall-search input{width:150px}}',
      '@media (max-width:460px){.dsh-sticky-wall-wall{grid-template-columns:minmax(0,1fr)}',
      '.dsh-sticky-wall-category{width:96px}.dsh-sticky-wall-hint{display:none}',
      '.dsh-sticky-wall-inner{padding:16px 14px 48px}}',
      '@media (prefers-reduced-motion:reduce){.dsh-sticky-wall-dot{animation:none}.dsh-sticky-wall-swatch:hover{transform:none}}',
    ].join('');

    /* ---------------------------------------------------------------- 工具 */

    function localeIdOf(service) {
      try {
        const snapshot = service !== null && service !== undefined && typeof service.getLocale === 'function' ? service.getLocale() : undefined;
        const active = snapshot !== null && snapshot !== undefined ? snapshot.active || snapshot.id || snapshot.locale : undefined;
        if (typeof active === 'string' && active.toLowerCase().indexOf('zh') === 0) return 'zh';
        if (typeof active === 'string' && active !== '') return 'en';
      } catch {
        // 回退到 navigator。
      }
      try {
        const language = typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : '';
        if (language.toLowerCase().indexOf('zh') === 0) return 'zh';
      } catch {
        // 没有 navigator。
      }
      return 'en';
    }

    /** 取翻译；绑定失效时退回内置字典，保证控件永远有文字。 */
    function makeT(bound, locale) {
      const fallback = locale === 'zh' ? zh : en;
      return (key, params) => {
        let text;
        try {
          text = typeof bound === 'function' ? bound(key, params) : undefined;
        } catch {
          text = undefined;
        }
        if (typeof text !== 'string' || text === '' || text === key) text = fallback[key];
        if (typeof text !== 'string') text = key;
        if (params !== undefined && params !== null) {
          for (const name of Object.keys(params)) text = text.split(`{${name}}`).join(String(params[name]));
        }
        return text;
      };
    }

    function timeAgo(epoch, locale) {
      const value = typeof epoch === 'number' && Number.isFinite(epoch) ? epoch : Date.now();
      const diff = Math.max(0, Date.now() - value);
      if (diff < 60_000) return { kind: 'now' };
      if (diff < 3_600_000) return { kind: 'minutes', n: Math.floor(diff / 60_000) };
      if (diff < 86_400_000) return { kind: 'hours', n: Math.floor(diff / 3_600_000) };
      if (diff < 172_800_000) return { kind: 'yesterday' };
      const date = new Date(value);
      return { kind: 'date', text: locale === 'zh'
        ? `${date.getMonth() + 1}月${date.getDate()}日`
        : date.toLocaleDateString('en', { month: 'short', day: 'numeric' }) };
    }

    function readWall() {
      return fetch(API, { method: 'GET', credentials: 'same-origin', headers: { accept: 'application/json' } }).then(async (response) => {
        const body = await response.json().catch(() => null);
        if (body !== null && typeof body === 'object' && body.ok === true && body.value !== null && typeof body.value === 'object') return body.value;
        if (body !== null && typeof body === 'object' && body.ok === false && typeof body.error?.message === 'string') {
          throw new Error(body.error.message);
        }
        throw new Error(`HTTP ${response.status}`);
      });
    }

    function writeWall(op) {
      return fetch(API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(op),
      }).then(async (response) => {
        const body = await response.json().catch(() => null);
        if (body !== null && typeof body === 'object' && body.ok === true && body.value !== null && typeof body.value === 'object') return body.value;
        if (body !== null && typeof body === 'object' && body.ok === false && typeof body.error?.message === 'string') {
          throw new Error(body.error.message);
        }
        throw new Error(`HTTP ${response.status}`);
      });
    }

    /* ---------------------------------------------------------------- 图标 */

    function SearchIcon() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', 'aria-hidden': true },
        h('circle', { cx: 7, cy: 7, r: 4.3 }),
        h('path', { d: 'M10.3 10.3 14 14' }),
      );
    }

    function PlusIcon() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M8 3v10M3 8h10' }),
      );
    }

    function PinIcon(props) {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: props.filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M9.7 2.2 13.8 6.3l-1.6.5-2.2 2.2-.4 2.6-4.9-4.9 2.6-.4 2.2-2.2z' }),
        h('path', { d: 'm5.6 10.4-3.3 3.3' }),
      );
    }

    function PaletteIcon() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M8 2.4c3.1 0 5.6 2.2 5.6 4.9 0 1.4-1.1 2.3-2.5 2.3H9.9c-.8 0-1.4.6-1.4 1.4 0 .4.1.6.1 1 0 .9-.7 1.4-1.6 1.4-3 0-5-2.4-5-5.2S4.9 2.4 8 2.4Z' }),
        h('circle', { cx: 5.9, cy: 7.1, r: 0.75, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 8.4, cy: 5.4, r: 0.75, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 10.9, cy: 7.1, r: 0.75, fill: 'currentColor', stroke: 'none' }),
      );
    }

    function TrashIcon() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M2.9 4.3h10.2' }),
        h('path', { d: 'M6.3 4.3V2.9h3.4v1.4' }),
        h('path', { d: 'M4.4 4.3l.6 8.2c0 .5.4.9.9.9h3.2c.5 0 .9-.4.9-.9l.6-8.2' }),
      );
    }

    function ChecklistIcon() {
      return h('svg', { width: 11, height: 11, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('rect', { x: 2.4, y: 2.4, width: 11.2, height: 11.2, rx: 2.4 }),
        h('path', { d: 'M5.2 8.2 7.1 10 10.9 5.9' }),
      );
    }

    function CheckIcon() {
      return h('svg', { width: 9, height: 9, viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M2.4 6.3 4.8 8.7 9.7 3.2' }),
      );
    }

    function ArchiveIcon(props) {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('rect', { x: 2.4, y: 3, width: 11.2, height: 3.4, rx: 1 }),
        h('path', { d: 'M3.4 6.4v5.4c0 .7.6 1.2 1.2 1.2h6.8c.7 0 1.2-.6 1.2-1.2V6.4' }),
        props.open === true
          ? h('path', { d: 'M6 9.6 8 7.6l2 2' })
          : h('path', { d: 'M6 9.2h4' }),
      );
    }

    function Swatch(props) {
      const { color, label } = props;
      return h('button', {
        type: 'button',
        className: 'dsh-sticky-wall-swatch',
        'data-tint': color,
        title: label,
        'aria-label': label,
        'aria-pressed': props.selected === true,
        onClick: () => props.onSelect(color),
      });
    }

    /* ---------------------------------------------------------------- 便签 */

    /** 随机取一个纸色；尽量不和上一张重复。 */
    function randomColor(except) {
      const pool = COLORS.filter((color) => color !== except);
      return pool[Math.floor(Math.random() * pool.length)] ?? 'amber';
    }

    /** 待办项：正文按行拆，忽略空行。 */
    function todoItems(text) {
      return String(text ?? '').split('\n').map((line) => line.trim()).filter((line) => line !== '');
    }

    /** 用 id 派生确定的角度与上下偏移：同一张便签永远同一个姿势，整面墙像手贴的。 */
    function tiltOf(note) {
      const seed = typeof note.id === 'string' ? note.id : String(note.createdAt ?? '');
      let hash = 0;
      for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) % 100003;
      const angle = ((hash % 241) - 120) / 120;
      const shift = (Math.floor(hash / 7) % 5) - 2;
      return { rot: Math.round(angle * 1.6 * 100) / 100, y: shift };
    }

    function NoteCard(props) {
      const { note, t, editing, disabled, locale } = props;
      const [text, setText] = React.useState(note.text);
      const [category, setCategory] = React.useState(note.category);
      const [kind, setKind] = React.useState(note.kind === 'todo' ? 'todo' : 'note');
      const [saving, setSaving] = React.useState(false);
      const field = React.useRef(null);
      const cancelled = React.useRef(false);
      const time = timeAgo(note.updatedAt ?? note.createdAt, locale);
      const timeText = time.kind === 'now' ? t('justNow')
        : time.kind === 'minutes' ? t('minutesAgo', { n: time.n })
        : time.kind === 'hours' ? t('hoursAgo', { n: time.n })
        : time.kind === 'yesterday' ? t('yesterday')
        : time.text;

      React.useEffect(() => {
        if (!editing) return undefined;
        cancelled.current = false;
        setText(note.text);
        setCategory(note.category);
        setKind(note.kind === 'todo' ? 'todo' : 'note');
        const timer = setTimeout(() => {
          try {
            field.current?.focus();
            field.current?.setSelectionRange(note.text.length, note.text.length);
          } catch {
            // 输入框已经不在。
          }
        }, 0);
        return () => clearTimeout(timer);
      }, [editing, note.text, note.category]);

      const cancel = () => {
        cancelled.current = true;
        props.onCancelEdit();
      };

      const commit = async () => {
        if (cancelled.current) return;
        const nextText = text.trim();
        const nextCategory = category.replace(/\s+/g, ' ').trim();
        const nextKind = kind === 'todo' ? 'todo' : 'note';
        if (nextText.length === 0) {
          props.onCancelEdit();
          return;
        }
        if (nextText === note.text && nextCategory === note.category && nextKind === note.kind) {
          props.onCancelEdit();
          return;
        }
        setSaving(true);
        try {
          await props.onSave(note.id, nextText, nextCategory, nextKind);
        } finally {
          setSaving(false);
        }
      };

      const pinAction = h('button', {
        type: 'button',
        className: `dsh-note-btn${note.pinned ? ' is-on' : ''}`,
        title: note.pinned ? t('unpin') : t('pin'),
        'aria-label': note.pinned ? t('unpin') : t('pin'),
        'aria-pressed': note.pinned === true,
        disabled: disabled || saving,
        onClick: () => props.onPin(note),
      }, PinIcon({ filled: note.pinned }));

      const colorAction = h('button', {
        type: 'button',
        className: 'dsh-note-btn',
        title: t('color'),
        'aria-label': t('color'),
        disabled: disabled || saving,
        onClick: () => props.onColor(note),
      }, PaletteIcon());

      const archiveAction = h('button', {
        type: 'button',
        className: 'dsh-note-btn',
        title: props.archiveView ? t('unarchive') : t('archive'),
        'aria-label': props.archiveView ? t('unarchive') : t('archive'),
        disabled: disabled || saving,
        onClick: () => props.onArchive(note),
      }, ArchiveIcon({ open: props.archiveView === true }));

      const removeAction = h('button', {
        type: 'button',
        className: 'dsh-note-btn',
        title: t('remove'),
        'aria-label': t('remove'),
        disabled: disabled || saving,
        onClick: () => props.onRemove(note),
      }, TrashIcon());

      const actionButtons = props.archiveView
        ? [archiveAction, removeAction]
        : [pinAction, colorAction, archiveAction, removeAction];

      const items = note.kind === 'todo'
        ? (Array.isArray(note.items) && note.items.length > 0
            ? note.items
            : todoItems(note.text).map((text, index) => ({ id: `line-${index}`, text, done: false })))
        : [];
      const doneCount = items.reduce((total, item) => total + (item.done === true ? 1 : 0), 0);

      const tilt = tiltOf(note);
      return h('article', {
        className: `dsh-note${note.pinned ? ' is-pinned' : ''}`,
        'data-tint': note.color,
        'data-note-id': note.id,
        style: { '--rot': `${tilt.rot}deg`, '--y': `${tilt.y}px` },
      },
        editing
          ? h('div', { className: 'dsh-note-edit' },
              h('div', { className: 'dsh-note-edit-head' },
                h('input', {
                  className: 'dsh-note-edit-category',
                  value: category,
                  maxLength: 24,
                  placeholder: t('editKicker'),
                  'aria-label': t('editKicker'),
                  onChange: (event) => setCategory(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancel();
                    }
                  },
                }),
                h('button', {
                  type: 'button',
                  className: 'dsh-note-kind',
                  'aria-pressed': kind === 'todo' ? 'true' : 'false',
                  title: t('todo'),
                  onClick: () => setKind((current) => (current === 'todo' ? 'note' : 'todo')),
                }, ChecklistIcon(), t('todo')),
              ),
              h('textarea', {
                ref: field,
                value: text,
                placeholder: kind === 'todo' ? t('editTodoHint') : undefined,
                'aria-label': t('editKicker'),
                onChange: (event) => setText(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancel();
                    return;
                  }
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void commit();
                  }
                },
                onBlur: (event) => {
                  // 点卡片内的 保存/取消 按钮会先触发 blur：这时交给按钮处理，
                  // 否则「取消」会被当成「保存」。
                  const next = event.relatedTarget;
                  const card = event.currentTarget.closest('.dsh-note');
                  if (next !== null && card !== null && card.contains(next)) return;
                  if (saving) return;
                  void commit();
                },
              }),
              h('div', { className: 'dsh-note-edit-actions' },
                h('button', { type: 'button', onClick: cancel }, t('cancel')),
                h('button', { type: 'button', 'data-primary': 'true', disabled: saving, onClick: () => void commit() }, t('save')),
              ),
            )
          : [
              note.kind === 'todo'
                ? h('div', { className: 'dsh-note-kicker-row', key: 'kicker' },
                    h('div', { className: 'dsh-note-kicker' }, note.category !== '' ? note.category : t('todo')),
                    h('span', { className: 'dsh-note-progress' }, t('progress', { done: doneCount, total: items.length })),
                  )
                : (note.category !== ''
                    ? h('div', { className: 'dsh-note-kicker', key: 'kicker' }, note.category)
                    : null),
              note.kind === 'todo'
                ? h('div', { className: 'dsh-note-todos', key: 'body' },
                    items.map((item, index) => h('div', { className: 'dsh-note-todo', key: index },
                      h('button', {
                        type: 'button',
                        role: 'checkbox',
                        className: 'dsh-note-check',
                        'aria-checked': item.done === true ? 'true' : 'false',
                        'aria-label': item.text,
                        disabled: disabled || saving,
                        onClick: (event) => {
                          event.stopPropagation();
                          props.onToggleCheck(note, item);
                        },
                      }, item.done === true ? CheckIcon() : null),
                      h('span', {
                        className: `dsh-note-todo-text${item.done === true ? ' is-done' : ''}`,
                        tabIndex: 0,
                        onClick: () => { if (!disabled) props.onStartEdit(note); },
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (!disabled) props.onStartEdit(note);
                          }
                        },
                      }, item.text),
                    )),
                  )
                : h('p', {
                    key: 'body',
                    className: 'dsh-note-body',
                    tabIndex: 0,
                    onClick: () => { if (!disabled) props.onStartEdit(note); },
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (!disabled) props.onStartEdit(note);
                      }
                    },
                  }, note.text),
              h('footer', { className: 'dsh-note-foot', key: 'foot' },
                h('span', { className: 'dsh-note-time' }, timeText),
                h('div', { className: 'dsh-note-actions' }, actionButtons),
              ),
            ],
      );
    }

    /* ---------------------------------------------------------------- 页面 */

    function NotesPage(props) {
      const locale = typeof props.notesLocale === 'function' ? props.notesLocale() : 'zh';
      const t = makeT(props.notesT, locale);
      const [status, setStatus] = React.useState('loading');
      const [notes, setNotes] = React.useState([]);
      const [problem, setProblem] = React.useState('');
      const [notice, setNotice] = React.useState('');
      const [draft, setDraft] = React.useState('');
      const [draftCategory, setDraftCategory] = React.useState('');
      const [draftColor, setDraftColor] = React.useState(() => randomColor());
      const [draftKind, setDraftKind] = React.useState('note');
      const [query, setQuery] = React.useState('');
      const [editingId, setEditingId] = React.useState(null);
      const [adding, setAdding] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [undo, setUndo] = React.useState(null);
      const undoTimer = React.useRef(null);
      const [view, setView] = React.useState('wall');
      const [filter, setFilter] = React.useState('all');
      const [expandedOlder, setExpandedOlder] = React.useState(false);
      const field = React.useRef(null);
      const alive = React.useRef(true);

      React.useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
      }, []);

      const applyWall = React.useCallback((value) => {
        if (!alive.current) return;
        setNotes(Array.isArray(value?.notes) ? value.notes : []);
        setStatus('ready');
        setProblem('');
      }, []);

      const load = React.useCallback(async () => {
        setStatus((current) => (current === 'ready' ? current : 'loading'));
        try {
          const value = await readWall();
          applyWall(value);
        } catch (error) {
          if (!alive.current) return;
          setProblem(error instanceof Error ? error.message : String(error));
          setStatus('error');
        }
      }, [applyWall]);

      React.useEffect(() => { void load(); }, [load]);

      React.useEffect(() => () => {
        if (undoTimer.current !== null) clearTimeout(undoTimer.current);
      }, []);

      // 另一个窗口改了墙：回到这个窗口时静默重拉一次。
      React.useEffect(() => {
        const refresh = () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          if (busy || adding || editingId !== null) return;
          void load();
        };
        if (typeof window !== 'undefined') window.addEventListener('focus', refresh);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refresh);
        return () => {
          if (typeof window !== 'undefined') window.removeEventListener('focus', refresh);
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refresh);
        };
      }, [busy, adding, editingId, load]);

      // 某个分类的最后一张被归档/删掉后，筛选条要回到「全部」。
      React.useEffect(() => {
        if (filter === 'all' || filter === 'uncategorized') return;
        if (notes.some((note) => note.archivedAt === undefined && note.category === filter)) return;
        setFilter('all');
      }, [filter, notes]);

      const mutate = async (op, failKey) => {
        setBusy(true);
        setNotice('');
        try {
          const value = await writeWall(op);
          applyWall(value);
          return true;
        } catch (error) {
          if (alive.current) {
            const message = error instanceof Error ? error.message : String(error);
            setNotice(t(failKey, { message }));
          }
          return false;
        } finally {
          if (alive.current) setBusy(false);
        }
      };

      const add = async () => {
        const text = draft.trim();
        if (text.length === 0 || adding) return;
        setAdding(true);
        const ok = await mutate({
          op: 'add',
          text,
          color: draftColor,
          kind: draftKind,
          category: draftCategory.replace(/\s+/g, ' ').trim(),
        }, 'addFailed');
        setAdding(false);
        if (ok) {
          setDraft('');
          setDraftCategory('');
          // 下一张重新随机：默认不再永远停在同一个颜色；本次手动选的颜色仍然生效。
          setDraftColor((current) => randomColor(current));
          try { field.current?.focus(); } catch { /* 已卸载 */ }
        }
      };

      const save = async (id, text, category, kind) => {
        const ok = await mutate({ op: 'update', id, text, category, kind }, 'saveFailed');
        // 保存期间用户可能已经点开另一张：只关掉自己这张的编辑态。
        if (ok && alive.current) setEditingId((current) => (current === id ? null : current));
      };

      const pin = (note) => { void mutate({ op: 'update', id: note.id, pinned: note.pinned !== true }, 'saveFailed'); };
      const recolor = (note) => {
        const index = COLORS.indexOf(note.color);
        const next = COLORS[(index + 1) % COLORS.length];
        void mutate({ op: 'update', id: note.id, color: next }, 'saveFailed');
      };
      const remove = (note) => {
        void mutate({ op: 'remove', id: note.id }, 'removeFailed').then((ok) => {
          if (!ok || !alive.current) return;
          setUndo(note);
          if (undoTimer.current !== null) clearTimeout(undoTimer.current);
          undoTimer.current = window.setTimeout(() => {
            undoTimer.current = null;
            if (alive.current) setUndo(null);
          }, 6000);
        });
      };
      const undoRemove = async () => {
        if (undo === null) return;
        const note = undo;
        setUndo(null);
        if (undoTimer.current !== null) {
          clearTimeout(undoTimer.current);
          undoTimer.current = null;
        }
        await mutate({ op: 'restore', note }, 'saveFailed');
      };
      const toggleCheck = (note, item) => {
        void mutate({
          op: 'check',
          id: note.id,
          itemId: item.id,
          done: item.done !== true,
        }, 'saveFailed');
      };
      const archive = (note) => {
        const leaving = note.archivedAt === undefined;
        void mutate({ op: 'update', id: note.id, archived: leaving }, 'saveFailed');
        if (leaving) setEditingId(null);
      };

      const activeNotes = notes.filter((note) => note.archivedAt === undefined);
      const archivedNotes = notes
        .filter((note) => note.archivedAt !== undefined)
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
      const pool = view === 'archive' ? archivedNotes : activeNotes;
      const normalized = query.trim().toLowerCase();
      const filtering = filter !== 'all' || normalized !== '';
      const visible = pool.filter((note) => {
        if (filter !== 'all') {
          if (filter === 'uncategorized') {
            if (note.category !== '') return false;
          } else if (note.category !== filter) {
            return false;
          }
        }
        if (normalized === '') return true;
        return note.text.toLowerCase().includes(normalized)
          || (typeof note.category === 'string' && note.category.toLowerCase().includes(normalized));
      });

      // 分类 chips：数量多的在前，未分类排最后。
      const chipCounts = new Map();
      for (const note of activeNotes) {
        const key = note.category === '' ? 'uncategorized' : note.category;
        chipCounts.set(key, (chipCounts.get(key) ?? 0) + 1);
      }
      const chipItems = [...chipCounts.entries()]
        .filter(([key]) => key !== 'uncategorized')
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([key, count]) => ({ key, count }));
      const uncategorizedCount = chipCounts.get('uncategorized') ?? 0;

      // 时间分区：今天 / 本周 / 更早；更早默认收起。
      const todayStart = (() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })();
      const weekStart = todayStart - 6 * 86_400_000;
      const groups = [
        { key: 'today', label: t('today'), notes: [] },
        { key: 'week', label: t('thisWeek'), notes: [] },
        { key: 'older', label: t('earlier'), notes: [] },
      ];
      for (const note of activeNotes) {
        const time = typeof note.createdAt === 'number' ? note.createdAt : (note.updatedAt ?? 0);
        if (time >= todayStart) groups[0].notes.push(note);
        else if (time >= weekStart) groups[1].notes.push(note);
        else groups[2].notes.push(note);
      }

      const renderWall = (list) => h('div', { className: 'dsh-sticky-wall-wall' },
        list.map((note) => h(NoteCard, {
          key: note.id,
          note,
          t,
          locale,
          editing: editingId === note.id,
          disabled: busy,
          archiveView: view === 'archive',
          onStartEdit: (target) => { if (!busy) setEditingId(target.id); },
          onCancelEdit: () => setEditingId(null),
          onSave: save,
          onPin: pin,
          onColor: recolor,
          onRemove: remove,
          onArchive: archive,
          onToggleCheck: toggleCheck,
        })),
      );

      const chipButton = (key, label, count) => h('button', {
        key,
        type: 'button',
        className: `dsh-sticky-wall-chip${filter === key ? ' is-active' : ''}`,
        'aria-pressed': filter === key ? 'true' : 'false',
        onClick: () => setFilter((current) => (current === key ? 'all' : key)),
      }, label, h('span', { className: 'dsh-sticky-wall-chip-count' }, String(count)));

      const chips = view === 'archive'
        ? null
        : h('div', { className: 'dsh-sticky-wall-chips', role: 'group', 'aria-label': t('filterLabel') },
            chipButton('all', t('filterAll'), activeNotes.length),
            chipItems.map((item) => chipButton(item.key, item.key, item.count)),
            uncategorizedCount > 0 ? chipButton('uncategorized', t('uncategorized'), uncategorizedCount) : null,
          );

      const composer = h('section', { className: 'dsh-sticky-wall-composer' },
        h('textarea', {
          ref: field,
          value: draft,
          rows: 3,
          autoFocus: true,
          placeholder: draftKind === 'todo' ? t('composerTodoPlaceholder') : t('composerPlaceholder'),
          'aria-label': t('composerPlaceholder'),
          onChange: (event) => setDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void add();
            }
          },
        }),
        h('div', { className: 'dsh-sticky-wall-bar' },
          h('div', { className: 'dsh-sticky-wall-swatches', role: 'group', 'aria-label': t('color') },
            COLORS.map((color) => h(Swatch, {
              key: color,
              color,
              label: t(`color_${color}`),
              selected: draftColor === color,
              onSelect: setDraftColor,
            })),
          ),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-wall-todo-toggle',
            'aria-pressed': draftKind === 'todo' ? 'true' : 'false',
            title: t('todo'),
            onClick: () => setDraftKind((current) => (current === 'todo' ? 'note' : 'todo')),
          }, ChecklistIcon(), t('todo')),
          h('input', {
            className: 'dsh-sticky-wall-category',
            value: draftCategory,
            maxLength: 24,
            placeholder: t('categoryPlaceholder'),
            'aria-label': t('categoryPlaceholder'),
            onChange: (event) => setDraftCategory(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void add();
              }
            },
          }),
          h('span', { className: 'dsh-sticky-wall-spacer' }),
          h('span', { className: 'dsh-sticky-wall-hint' }, t('composerHint')),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-wall-add',
            disabled: adding || draft.trim().length === 0,
            onClick: () => void add(),
          }, PlusIcon(), adding ? t('adding') : t('add')),
        ),
      );

      const body = (() => {
        if (status === 'loading' && notes.length === 0) {
          return h('div', { className: 'dsh-sticky-wall-loading', role: 'status' },
            h('span', { className: 'dsh-sticky-wall-dots', 'aria-hidden': true },
              h('span', { className: 'dsh-sticky-wall-dot' }),
              h('span', { className: 'dsh-sticky-wall-dot' }),
              h('span', { className: 'dsh-sticky-wall-dot' }),
            ),
            h('span', null, t('loading')),
          );
        }
        if (status === 'error' && notes.length === 0) {
          return h('div', { className: 'dsh-sticky-wall-empty', role: 'alert' },
            h('strong', null, t('errorTitle')),
            h('span', null, t('errorBody')),
            h('button', { type: 'button', className: 'dsh-sticky-wall-retry', onClick: () => void load() }, t('retry')),
            problem !== '' ? h('span', { style: { opacity: 0.65, fontSize: 11 } }, problem) : null,
          );
        }
        if (view === 'archive' && archivedNotes.length === 0) {
          return h('div', { className: 'dsh-sticky-wall-empty' },
            h('strong', null, t('emptyArchiveTitle')),
            h('span', null, t('emptyArchiveBody')),
          );
        }
        if (view === 'wall' && activeNotes.length === 0) {
          return h('div', { className: 'dsh-sticky-wall-empty' },
            h('strong', null, t('emptyTitle')),
            h('span', null, t('emptyBody')),
          );
        }
        if (visible.length === 0) {
          return h('div', { className: 'dsh-sticky-wall-empty' },
            h('strong', null, t('emptySearchTitle')),
            h('span', null, t('emptySearchBody')),
            h('button', { type: 'button', className: 'dsh-sticky-wall-retry', onClick: () => { setQuery(''); setFilter('all'); } }, t('searchClear')),
          );
        }
        if (filtering || view === 'archive') return renderWall(visible);
        return groups
          .filter((group) => group.notes.length > 0)
          .map((group) => {
            const collapsible = group.key === 'older';
            const shown = !collapsible || expandedOlder;
            return h('section', { className: 'dsh-sticky-wall-section', key: group.key },
              h('div', { className: 'dsh-sticky-wall-section-head' },
                h('span', { className: 'dsh-sticky-wall-section-label' }, group.label),
                h('span', { className: 'dsh-sticky-wall-section-count' }, String(group.notes.length)),
                collapsible
                  ? h('button', {
                      type: 'button',
                      className: 'dsh-sticky-wall-section-toggle',
                      onClick: () => setExpandedOlder((current) => !current),
                    }, expandedOlder ? t('collapse') : t('expand', { n: group.notes.length }))
                  : null,
              ),
              shown ? renderWall(group.notes) : null,
            );
          });
      })();

      return h('div', { className: 'dsh-sticky-wall-root', 'data-dsh-sticky-wall': 'panel' },
        h('style', { key: 'dsh-sticky-wall-style' }, STYLE),
        h('div', { className: 'dsh-sticky-wall-inner' },
          h('header', { className: 'dsh-sticky-wall-top' },
            h('div', { className: 'dsh-sticky-wall-heading' },
              h('h1', null, t('title')),
              h('p', { className: 'dsh-sticky-wall-subtitle' }, view === 'archive' ? t('archiveSubtitle') : t('subtitle')),
            ),
            h('div', { className: 'dsh-sticky-wall-topright' },
              h('div', { className: 'dsh-sticky-wall-search' },
                SearchIcon(),
                h('input', {
                  type: 'search',
                  value: query,
                  placeholder: t('search'),
                  'aria-label': t('search'),
                  onChange: (event) => setQuery(event.target.value),
                }),
              ),
              h('span', { className: 'dsh-sticky-wall-count' }, view === 'archive'
                ? t('archiveCount', { n: archivedNotes.length })
                : (activeNotes.length === 0 ? t('countEmpty') : t('count', { n: activeNotes.length }))),
              (archivedNotes.length > 0 || view === 'archive')
                ? h('button', {
                    type: 'button',
                    className: `dsh-sticky-wall-archivebtn${view === 'archive' ? ' is-active' : ''}`,
                    onClick: () => {
                      setView((current) => (current === 'archive' ? 'wall' : 'archive'));
                      setFilter('all');
                      setQuery('');
                      setEditingId(null);
                    },
                  }, ArchiveIcon({ open: view === 'archive' }), view === 'archive' ? t('backToWall') : t('archiveView', { n: archivedNotes.length }))
                : null,
            ),
          ),
          view === 'wall' ? composer : null,
          view === 'wall' ? chips : null,
          notice !== ''
            ? h('div', { className: 'dsh-sticky-wall-notice', role: 'alert' },
                h('span', null, notice),
                h('button', { type: 'button', onClick: () => setNotice('') }, t('cancel')),
              )
            : null,
          undo !== null
            ? h('div', { className: 'dsh-sticky-wall-notice dsh-sticky-wall-notice--undo', role: 'status' },
                h('span', null, t('noteRemoved')),
                h('button', { type: 'button', onClick: () => void undoRemove() }, t('undo')),
                h('button', {
                  type: 'button',
                  className: 'dsh-sticky-wall-notice-close',
                  'aria-label': t('cancel'),
                  onClick: () => setUndo(null),
                }, '×'),
              )
            : null,
          body,
        ),
      );
    }

    /* ---------------------------------------------------------------- 侧边栏图标 */

    function NotesIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 16;
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block', flex: 'none' },
      },
        h('path', { d: 'M2.6 2.6h7.1l3.7 3.7v7.1H2.6z' }),
        h('path', { d: 'M9.7 2.6v3.7h3.7' }),
        h('path', { d: 'M4.9 8.1h6.2M4.9 10.5h4.2' }),
      );
    }

    /* ---------------------------------------------------------------- 入口 */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-sticky-wall: dictionaries');

        let bound = null;
        try {
          bound = ctx.locale.bind(NS);
        } catch {
          bound = null;
        }
        const label = () => {
          const fallback = localeIdOf(ctx.locale) === 'zh' ? zh.panel : en.panel;
          try {
            const text = typeof bound === 'function' ? bound('panel') : '';
            return typeof text === 'string' && text !== '' && text !== 'panel' ? text : fallback;
          } catch {
            return fallback;
          }
        };

        try {
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({
              notesT: bound,
              notesLocale: () => localeIdOf(ctx.locale),
            }),
          }, NotesPage));
        } catch (error) {
          console.warn('[dsh-sticky-wall] main 面板注册失败：', error);
        }

        try {
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 30,
            locale: NS,
            label,
          }, NotesIcon));
        } catch (error) {
          console.warn('[dsh-sticky-wall] 侧边栏入口注册失败：', error);
        }
      },
    };
  },
});
