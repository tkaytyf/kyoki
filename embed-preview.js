(function (global) {
  "use strict";

  var DEFAULT_COLOR = 0x2B2D31;
  var DEFAULT_HEX = "#2B2D31";

  function isSafeUrl(value) {
    if (!value || typeof value !== "string") return false;
    var v = value.trim();
    if (v.indexOf("{") !== -1) return false;
    return /^https:\/\//i.test(v) || /^http:\/\//i.test(v);
  }

  function parseColor(value) {
    if (value == null || value === "") return DEFAULT_COLOR;
    if (typeof value === "number" && isFinite(value)) return value >>> 0;
    var s = String(value).trim();
    if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16) >>> 0;
    if (s.charAt(0) === "#") s = s.slice(1);
    if (/^[0-9a-f]{6}$/i.test(s)) return parseInt(s, 16) >>> 0;
    if (/^\d+$/.test(s)) return parseInt(s, 10) >>> 0;
    return DEFAULT_COLOR;
  }

  function colorHex(n) {
    return "#" + ("000000" + (n >>> 0).toString(16)).slice(-6).toUpperCase();
  }

  function text(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null && value !== "") node.textContent = value;
    return node;
  }

  function cleanString(value) {
    if (value == null) return "";
    return String(value).trim();
  }

  function omitEmptyEmbed(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var out = {};
    var title = cleanString(raw.title);
    var url = cleanString(raw.url);
    var description = cleanString(raw.description);
    if (title) out.title = title;
    if (url && isSafeUrl(url)) out.url = url.trim();
    else if (url) out.url = url;
    if (description) out.description = description;

    var color = raw.color;
    if (color !== undefined && color !== null && color !== "") {
      out.color = parseColor(color);
    }

    if (raw.author && typeof raw.author === "object") {
      var author = {};
      if (cleanString(raw.author.name)) author.name = cleanString(raw.author.name);
      if (cleanString(raw.author.url)) author.url = cleanString(raw.author.url);
      if (cleanString(raw.author.icon_url)) author.icon_url = cleanString(raw.author.icon_url);
      if (author.name || author.icon_url) out.author = author;
    }
    if (raw.footer && typeof raw.footer === "object") {
      var footer = {};
      if (cleanString(raw.footer.text)) footer.text = cleanString(raw.footer.text);
      if (cleanString(raw.footer.icon_url)) footer.icon_url = cleanString(raw.footer.icon_url);
      if (footer.text || footer.icon_url) out.footer = footer;
    }
    if (raw.image && typeof raw.image === "object" && cleanString(raw.image.url)) {
      out.image = { url: cleanString(raw.image.url) };
    } else if (typeof raw.image === "string" && cleanString(raw.image)) {
      out.image = { url: cleanString(raw.image) };
    }
    if (raw.thumbnail && typeof raw.thumbnail === "object" && cleanString(raw.thumbnail.url)) {
      out.thumbnail = { url: cleanString(raw.thumbnail.url) };
    } else if (typeof raw.thumbnail === "string" && cleanString(raw.thumbnail)) {
      out.thumbnail = { url: cleanString(raw.thumbnail) };
    }
    var timestamp = cleanString(raw.timestamp);
    if (timestamp) out.timestamp = timestamp;

    if (Array.isArray(raw.fields)) {
      var fields = [];
      raw.fields.forEach(function (field) {
        if (!field || typeof field !== "object") return;
        var name = cleanString(field.name);
        var value = cleanString(field.value);
        if (!name && !value) return;
        var item = { name: name || "\u200b", value: value || "\u200b" };
        if (field.inline) item.inline = true;
        fields.push(item);
      });
      if (fields.length) out.fields = fields;
    }
    return Object.keys(out).length ? out : null;
  }

  function coerceMessage(message) {
    if (message == null || message === "") return { content: "", embed: null };
    if (typeof message === "string") return { content: message, embed: null };
    if (typeof message !== "object") return { content: "", embed: null };
    if (message.embed || ("content" in message && (message.embed || message.content))) {
      return {
        content: cleanString(message.content),
        embed: omitEmptyEmbed(message.embed || {})
      };
    }
    var embed = omitEmptyEmbed(message);
    return { content: "", embed: embed };
  }


  /* Discord-style markdown for the live preview only.
     All text is applied with textContent / createElement — never innerHTML of raw input.
     Copy/JSON output is unchanged. Variables like {server} stay literal. */
  function isWordChar(ch) {
    return ch && /[A-Za-z0-9]/.test(ch);
  }

  function findClose(text, start, delim, underscoreWord) {
    var i = start;
    while (i < text.length) {
      if (text.substr(i, delim.length) === delim) {
        if (underscoreWord && isWordChar(text.charAt(i + delim.length))) {
          i += 1;
          continue;
        }
        if (i > start) return i;
        return -1;
      }
      i += 1;
    }
    return -1;
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function appendInline(parent, text, allowLinks) {
    if (text == null || text === "") return;
    text = String(text);
    var i = 0;
    var buf = "";
    function flush() {
      if (buf) {
        parent.appendChild(document.createTextNode(buf));
        buf = "";
      }
    }
    function takeDelim(delim, tag, className, underscoreWord) {
      if (text.substr(i, delim.length) !== delim) return false;
      if (underscoreWord && i > 0 && isWordChar(text.charAt(i - 1))) return false;
      var close = findClose(text, i + delim.length, delim, underscoreWord);
      if (close < 0) return false;
      flush();
      var node = el(tag, className);
      appendInline(node, text.slice(i + delim.length, close), allowLinks);
      parent.appendChild(node);
      i = close + delim.length;
      return true;
    }
    while (i < text.length) {
      var ch = text.charAt(i);
      var rest = text.slice(i);
      if (ch === "`" && !rest.startsWith("```")) {
        var end = text.indexOf("`", i + 1);
        if (end > i + 1) {
          flush();
          var code = el("code", "d-md-code");
          code.textContent = text.slice(i + 1, end);
          parent.appendChild(code);
          i = end + 1;
          continue;
        }
      }
      if (allowLinks && ch === "[") {
        var closeBracket = text.indexOf("]", i + 1);
        if (closeBracket > i && text.charAt(closeBracket + 1) === "(") {
          var closeParen = text.indexOf(")", closeBracket + 2);
          if (closeParen > closeBracket) {
            var label = text.slice(i + 1, closeBracket);
            var href = text.slice(closeBracket + 2, closeParen).trim();
            flush();
            if (isSafeUrl(href)) {
              var link = el("a", "d-md-link");
              link.href = href;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              appendInline(link, label, false);
              parent.appendChild(link);
            } else {
              parent.appendChild(document.createTextNode("[" + label + "](" + href + ")"));
            }
            i = closeParen + 1;
            continue;
          }
        }
      }
      if (takeDelim("**", "strong") || takeDelim("__", "span", "d-md-underline") ||
          takeDelim("~~", "s") || takeDelim("*", "em")) {
        continue;
      }
      if (takeDelim("_", "em", "", true)) continue;
      buf += ch;
      i += 1;
    }
    flush();
  }

  function appendInlineLines(parent, lines, allowLinks) {
    lines.forEach(function (line, idx) {
      appendInline(parent, line, allowLinks);
      if (idx < lines.length - 1) parent.appendChild(document.createElement("br"));
    });
  }

  function splitFencedCode(text) {
    var parts = [];
    var re = /```[a-zA-Z0-9+-]*[ \t]*\n?([\s\S]*?)```/g;
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
      parts.push({ type: "code", value: m[1].replace(/\n$/, "") });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
    if (!parts.length) parts.push({ type: "text", value: text });
    return parts;
  }

  function renderDiscordMarkdown(source, allowLinks) {
    var frag = document.createDocumentFragment();
    if (source == null) return frag;
    if (allowLinks === undefined) allowLinks = true;
    splitFencedCode(String(source)).forEach(function (part) {
      if (part.type === "code") {
        var pre = el("pre", "d-md-pre");
        var code = el("code", "d-md-code");
        code.textContent = part.value;
        pre.appendChild(code);
        frag.appendChild(pre);
        return;
      }
      var lines = part.value.split("\n");
      var i = 0;
      while (i < lines.length) {
        if (/^> ?/.test(lines[i])) {
          var quote = el("blockquote", "d-md-quote");
          var qlines = [];
          while (i < lines.length && /^> ?/.test(lines[i])) {
            qlines.push(lines[i].replace(/^> ?/, ""));
            i += 1;
          }
          appendInlineLines(quote, qlines, allowLinks);
          frag.appendChild(quote);
        } else {
          var nlines = [];
          while (i < lines.length && !/^> ?/.test(lines[i])) {
            nlines.push(lines[i]);
            i += 1;
          }
          appendInlineLines(frag, nlines, allowLinks);
        }
      }
    });
    return frag;
  }

  function fillMarkdown(node, source, allowLinks) {
    node.appendChild(renderDiscordMarkdown(source, allowLinks));
  }

  function renderPreview(root, message) {
    if (!root) return;
    root.replaceChildren();
    var parsed = coerceMessage(message);
    var wrap = text("div", "d-preview");
    if (parsed.content) wrap.appendChild(text("p", "d-content", parsed.content));
    var embed = parsed.embed;
    if (!embed && !parsed.content) {
      wrap.appendChild(text("p", "d-empty", "The preview will show up here."));
      root.appendChild(wrap);
      return;
    }
    if (!embed) {
      root.appendChild(wrap);
      return;
    }
    var card = text("div", "d-embed");
    var bar = text("div", "d-embed-bar");
    var color = embed.color != null ? embed.color : DEFAULT_COLOR;
    bar.style.background = colorHex(color);
    card.appendChild(bar);

    var main = text("div", "d-embed-main");
    if (embed.author && (embed.author.name || embed.author.icon_url)) {
      var author = text("div", "d-author");
      if (isSafeUrl(embed.author.icon_url)) {
        var aimg = document.createElement("img");
        aimg.alt = "";
        aimg.src = embed.author.icon_url.trim();
        author.appendChild(aimg);
      }
      if (embed.author.name) {
        if (isSafeUrl(embed.author.url)) {
          var alink = document.createElement("a");
          alink.href = embed.author.url.trim();
          alink.target = "_blank";
          alink.rel = "noopener";
          alink.textContent = embed.author.name;
          author.appendChild(alink);
        } else {
          author.appendChild(document.createTextNode(embed.author.name));
        }
      }
      main.appendChild(author);
    }
    if (embed.title) {
      var title = text("p", "d-title");
      if (isSafeUrl(embed.url)) {
        var tlink = document.createElement("a");
        tlink.href = embed.url.trim();
        tlink.target = "_blank";
        tlink.rel = "noopener";
        fillMarkdown(tlink, embed.title, false);
        title.appendChild(tlink);
      } else {
        fillMarkdown(title, embed.title, true);
      }
      main.appendChild(title);
    }
    if (embed.description) {
      var desc = text("p", "d-desc");
      fillMarkdown(desc, embed.description, true);
      main.appendChild(desc);
    }
    if (embed.fields && embed.fields.length) {
      var box = text("div", "d-fields");
      var anyInline = embed.fields.some(function (f) { return f.inline; });
      if (anyInline) box.classList.add("has-inline");
      embed.fields.forEach(function (field) {
        var item = text("div", field.inline ? "d-field is-inline" : "d-field");
        if (!field.inline) item.style.gridColumn = "1 / -1";
        item.appendChild(text("p", "d-field-name", field.name));
        var fval = text("p", "d-field-value");
        fillMarkdown(fval, field.value, true);
        item.appendChild(fval);
        box.appendChild(item);
      });
      main.appendChild(box);
    }
    card.appendChild(main);

    if (embed.thumbnail && isSafeUrl(embed.thumbnail.url)) {
      var thumb = document.createElement("img");
      thumb.className = "d-thumb";
      thumb.alt = "";
      thumb.src = embed.thumbnail.url.trim();
      card.appendChild(thumb);
    }
    if (embed.image && isSafeUrl(embed.image.url)) {
      var image = document.createElement("img");
      image.className = "d-image";
      image.alt = "";
      image.src = embed.image.url.trim();
      card.appendChild(image);
    }
    if (embed.timestamp) {
      var ts = text("div", "d-footer");
      ts.textContent = embed.timestamp === "now" ? "now" : embed.timestamp;
      card.appendChild(ts);
    }
    if (embed.footer && (embed.footer.text || embed.footer.icon_url)) {
      var footer = text("div", "d-footer");
      if (isSafeUrl(embed.footer.icon_url)) {
        var fimg = document.createElement("img");
        fimg.alt = "";
        fimg.src = embed.footer.icon_url.trim();
        footer.appendChild(fimg);
      }
      if (embed.footer.text) {
        var ftext = document.createElement("span");
        fillMarkdown(ftext, embed.footer.text, true);
        footer.appendChild(ftext);
      }
      card.appendChild(footer);
    }
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function fieldRow(field) {
    field = field || {};
    var row = text("div", "embed-field-row");
    row.innerHTML =
      '<label class="field"><span class="field-label">Field name</span>' +
      '<input class="field-input js-field-name" maxlength="256"></label>' +
      '<label class="field"><span class="field-label">Value</span>' +
      '<input class="field-input js-field-value" maxlength="1024"></label>' +
      '<label class="field-check"><input class="js-field-inline" type="checkbox"> Inline</label>' +
      '<button class="btn-tiny js-field-remove" type="button">Remove</button>';
    row.querySelector(".js-field-name").value = field.name || "";
    row.querySelector(".js-field-value").value = field.value || "";
    row.querySelector(".js-field-inline").checked = !!field.inline;
    return row;
  }

  function formHTML(opts) {
    opts = opts || {};
    var content = opts.showContent
      ? '<label class="field"><span class="field-label">Text above the embed</span>' +
        '<input class="field-input js-content" maxlength="2000" placeholder="Optional plain text sent with the embed"></label>'
      : "";
    return (
      content +
      '<div class="form-grid two">' +
        '<label class="field"><span class="field-label">Author name</span><input class="field-input js-author-name" maxlength="256"></label>' +
        '<label class="field"><span class="field-label">Author URL</span><input class="field-input js-author-url" inputmode="url" placeholder="https://"></label>' +
        '<label class="field"><span class="field-label">Author icon URL</span><input class="field-input js-author-icon" inputmode="url" placeholder="https://"></label>' +
        '<label class="field"><span class="field-label">Title</span><input class="field-input js-title" maxlength="256"></label>' +
        '<label class="field"><span class="field-label">Title URL</span><input class="field-input js-url" inputmode="url" placeholder="https://"></label>' +
        '<div class="field"><span class="field-label">Color</span>' +
          '<div class="field-color-row">' +
            '<input class="js-color-picker" type="color" value="' + DEFAULT_HEX + '" aria-label="Pick a color">' +
            '<input class="field-input js-color" value="' + DEFAULT_HEX + '" spellcheck="false">' +
          '</div>' +
          '<p class="field-hint">Default is #2B2D31, the same gray kyōki uses, so the side bar disappears into the embed.</p>' +
        '</div>' +
      '</div>' +
      '<label class="field" style="margin-top:1rem"><span class="field-label">Description</span>' +
        '<textarea class="field-textarea js-description" maxlength="4096"></textarea></label>' +
      '<div class="field" style="margin-top:1rem"><span class="field-label">Fields</span>' +
        '<div class="embed-fields js-fields"></div>' +
        '<button class="btn-tiny js-add-field" type="button" style="margin-top:0.6rem">Add field</button></div>' +
      '<div class="form-grid two" style="margin-top:1rem">' +
        '<label class="field"><span class="field-label">Image URL</span><input class="field-input js-image" inputmode="url" placeholder="https://"></label>' +
        '<label class="field"><span class="field-label">Thumbnail URL</span><input class="field-input js-thumb" inputmode="url" placeholder="https:// or {avatar}"></label>' +
        '<label class="field"><span class="field-label">Footer text</span><input class="field-input js-footer-text" maxlength="2048"></label>' +
        '<label class="field"><span class="field-label">Footer icon URL</span><input class="field-input js-footer-icon" inputmode="url" placeholder="https://"></label>' +
        '<label class="field"><span class="field-label">Timestamp</span><input class="field-input js-timestamp" placeholder="now or ISO-8601" spellcheck="false"></label>' +
      '</div>'
    );
  }

  function readForm(root) {
    var val = function (sel) {
      var node = root.querySelector(sel);
      return node ? node.value : "";
    };
    var embed = {
      title: val(".js-title"),
      url: val(".js-url"),
      description: val(".js-description"),
      color: parseColor(val(".js-color")),
      author: {
        name: val(".js-author-name"),
        url: val(".js-author-url"),
        icon_url: val(".js-author-icon")
      },
      footer: {
        text: val(".js-footer-text"),
        icon_url: val(".js-footer-icon")
      },
      image: { url: val(".js-image") },
      thumbnail: { url: val(".js-thumb") },
      timestamp: val(".js-timestamp"),
      fields: []
    };
    root.querySelectorAll(".embed-field-row").forEach(function (row) {
      embed.fields.push({
        name: row.querySelector(".js-field-name").value,
        value: row.querySelector(".js-field-value").value,
        inline: row.querySelector(".js-field-inline").checked
      });
    });
    var contentNode = root.querySelector(".js-content");
    return {
      content: contentNode ? contentNode.value : "",
      embed: omitEmptyEmbed(embed)
    };
  }

  function fillForm(root, message) {
    var parsed = coerceMessage(message);
    var embed = parsed.embed || {};
    var set = function (sel, value) {
      var node = root.querySelector(sel);
      if (node) node.value = value || "";
    };
    set(".js-content", parsed.content);
    set(".js-title", embed.title);
    set(".js-url", embed.url);
    set(".js-description", embed.description);
    var hex = colorHex(embed.color != null ? embed.color : DEFAULT_COLOR);
    set(".js-color", hex);
    var picker = root.querySelector(".js-color-picker");
    if (picker) picker.value = hex;
    set(".js-author-name", embed.author && embed.author.name);
    set(".js-author-url", embed.author && embed.author.url);
    set(".js-author-icon", embed.author && embed.author.icon_url);
    set(".js-footer-text", embed.footer && embed.footer.text);
    set(".js-footer-icon", embed.footer && embed.footer.icon_url);
    set(".js-image", embed.image && embed.image.url);
    set(".js-thumb", embed.thumbnail && embed.thumbnail.url);
    set(".js-timestamp", embed.timestamp);
    var box = root.querySelector(".js-fields");
    if (box) {
      box.replaceChildren();
      (embed.fields || []).forEach(function (field) {
        box.appendChild(fieldRow(field));
      });
    }
  }

  function bindForm(root, onChange) {
    if (!root) return;
    if (!root.querySelector(".js-title")) root.innerHTML = formHTML({ showContent: !!root.getAttribute("data-content") });
    function emit() { if (onChange) onChange(readForm(root)); }
    root.addEventListener("input", emit);
    root.addEventListener("change", emit);
    root.addEventListener("click", function (event) {
      if (event.target.closest(".js-add-field")) {
        root.querySelector(".js-fields").appendChild(fieldRow());
        emit();
      } else if (event.target.closest(".js-field-remove")) {
        var row = event.target.closest(".embed-field-row");
        if (row) row.remove();
        emit();
      }
    });
    var picker = root.querySelector(".js-color-picker");
    var color = root.querySelector(".js-color");
    if (picker && color) {
      picker.addEventListener("input", function () {
        color.value = picker.value.toUpperCase();
        emit();
      });
      color.addEventListener("input", function () {
        try { picker.value = colorHex(parseColor(color.value)); } catch (e) {}
      });
    }
  }

  function toDocJson(parsed) {
    parsed = coerceMessage(parsed);
    var out = {};
    var content = cleanString(parsed.content);
    if (content) out.content = content;
    var embed = parsed.embed || {};
    if (embed.title) out.title = embed.title;
    if (embed.url) out.url = embed.url;
    if (embed.description) out.description = embed.description;
    if (embed.color != null && embed.color !== DEFAULT_COLOR) {
      out.color = colorHex(embed.color);
    }
    if (embed.author) out.author = embed.author;
    if (embed.footer) out.footer = embed.footer;
    if (embed.image) out.image = embed.image;
    if (embed.thumbnail) out.thumbnail = embed.thumbnail;
    if (embed.fields) out.fields = embed.fields;
    if (embed.timestamp) out.timestamp = embed.timestamp;
    return out;
  }

  function messagePayload(parsed, mode) {
    parsed = parsed || { content: "", embed: null };
    var content = cleanString(parsed.content);
    var embed = parsed.embed;
    if (mode === "plain" || (!embed && content)) return content;
    if (embed && content) return { content: content, embed: embed };
    if (embed) return embed;
    return content;
  }

  global.KyokiEmbed = {
    DEFAULT_COLOR: DEFAULT_COLOR,
    DEFAULT_HEX: DEFAULT_HEX,
    isSafeUrl: isSafeUrl,
    parseColor: parseColor,
    colorHex: colorHex,
    omitEmptyEmbed: omitEmptyEmbed,
    coerceMessage: coerceMessage,
    renderPreview: renderPreview,
    formHTML: formHTML,
    readForm: readForm,
    fillForm: fillForm,
    bindForm: bindForm,
    messagePayload: messagePayload,
    toDocJson: toDocJson
  };
})(window);
