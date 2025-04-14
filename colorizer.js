/**
 * CSharp Syntax Highlighter
 *
 * This module provides functionality to highlight C# code syntax by identifying and
 * marking different code elements (keywords, comments, strings, etc.) with HTML tags.
 * The highlighted code can then be styled with CSS for display.
 */

// C# state-related keywords (class definitions, types, modifiers, etc.)
const csharpStateSetOfKeywords = [
    "async", "assembly", "await", "using", "in", "as", "abstract", "base", "bool", "break", "byte",
    "catch", "char", "checked", "class", "const", "continue", "fixed", "bool?", "module", "decimal",
    "default", "delegate", "do", "double", "double?", "sizeof", "nameof", "enum", "explicit", "extern",
    "event", "false", "finally", "stackalloc", "mod", "float", "float?", "goto", "implicit", "static",
    "partial", "case", "readonly", "interface", "internal", "lock", "long", "long?", "unit", "get", "set",
    "record", "namespace", "new", "int", "int?", "null", "object", "object?", "operator", "out", "ulong",
    "override", "params", "private", "protected", "public", "unchecked", "where", "ref", "sbyte", "init",
    "sealed", "short", "string", "string?", "virtual", "struct", "switch", "this", "with", "true", "try",
    "void", "var", "value", "unsafe", "ushort", "typeof", "volatile", "is", "required", "when", "global"
];

// C# behavior/flow control keywords
const csharpBehaviorSetOfKeywords = ["return", "if", "while", "foreach", "for", "throw", "else"];

// HTML entity mapping for special characters that need escaping
const specialChars = { "<": "&lt;", ">": "&gt;" };

// Characters that can be adjacent to keywords to help identify complete tokens
const additionalKeywordChars = [
    " ", "[", "]", "(", ")", "=", ".", "{", "}", ";", "/", ",", "&gt;", ":"
];

// Regular expression to match PascalCase identifiers (starting with capital letter)
const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

/**
 * Replaces special characters with their HTML entity equivalents
 * @param {string} code - The source code to process
 * @return {string} - Code with special characters replaced
 */
function specialCharsShielding(code) {
    for (const [char, html] of Object.entries(specialChars)) {
        code = code.replaceAll(char, html);
    }
    return code;
}

/**
 * Inserts an opening tag at a specific position in the code
 * @param {string} code - The source code
 * @param {number} i - Position to insert the tag
 * @param {string} tag - The tag name
 * @param {string} open - Opening tag string
 * @param {string} close - Closing tag string (unused in this function)
 * @return {Array} - Updated code and new position index
 */
function tagInsert(code, i, tag, open, close) {
    code = code.slice(0, i) + open + code.slice(i);
    return [code, i + open.length];
}

/**
 * Inserts a closing tag at a specific position in the code
 * @param {string} code - The source code
 * @param {number} i - Position to insert the tag
 * @param {string} tag - The tag name
 * @param {string} open - Opening tag string (unused in this function)
 * @param {string} close - Closing tag string
 * @param {number} offset - Optional position offset
 * @return {Array} - Updated code and new position index
 */
function tagClose(code, i, tag, open, close, offset = 0) {
    code = code.slice(0, i + offset) + close + code.slice(i + offset);
    return [code, i + close.length + offset];
}

/**
 * Identifies and tags comments and string literals in the code
 * This is a critical first step as it prevents treating content inside
 * comments and strings as regular code
 *
 * @param {string} code - The source code to process
 * @return {string} - Code with comments and strings tagged
 */
function detectCommentsAndStrings(code) {
    // Track what type of block we're inside (if any)
    let inside = { str: false, single: false, multi: false, doc: false };

    // Mapping of opening sequences to their tag information
    const openTags = {
        "//": { key: "single", tag: "oneLineComment" },
        "/// ": { key: "doc", tag: "docComment" },
        "\"": { key: "str", tag: "str" },
        "/*": { key: "multi", tag: "multiLineComment" },
    };

    for (let i = 0; i < code.length - 4; i++) {
        const two = code.substring(i, i + 2);
        const four = code.substring(i, i + 4);
        // Check if we're not inside any block or if we're inside the relevant block type
        const isOpen = (tagKey) => !Object.values(inside).some(Boolean) || inside[tagKey];

        // Single-line comment detection
        if (two === "//" && four !== "/// " && isOpen("single")) {
            [code, i] = tagInsert(code, i, "oneLineComment", "<ignore><oneLineComment>", "</oneLineComment></ignore>");
            inside.single = true;
        } else if (code[i] === "\n" && inside.single) {
            [code, i] = tagClose(code, i, "oneLineComment", "<ignore>", "</oneLineComment></ignore>");
            inside.single = false;
        }
        // Documentation comment detection
        else if (four === "/// " && isOpen("doc")) {
            [code, i] = tagInsert(code, i, "docComment", "<ignore><docComment>", "</docComment></ignore>");
            inside.doc = true;
        } else if (code[i] === "\n" && inside.doc) {
            [code, i] = tagClose(code, i, "docComment", "<ignore>", "</docComment></ignore>");
            inside.doc = false;
        }
        // String literal detection
        else if (code[i] === "\"" && isOpen("str") && code[i - 1] !== "\\") {
            if (!inside.str) {
                [code, i] = tagInsert(code, i, "str", "<ignore><str>", "</str></ignore>");
                inside.str = true;
            } else {
                [code, i] = tagClose(code, i, "str", "<ignore>", "</str></ignore>", 1);
                inside.str = false;
            }
        }
        // Multi-line comment detection
        else if (two === "/*" && isOpen("multi")) {
            [code, i] = tagInsert(code, i, "multiLineComment", "<ignore><multiLineComment>", "</multiLineComment></ignore>");
            inside.multi = true;
        } else if (two === "*/" && inside.multi) {
            [code, i] = tagClose(code, i, "multiLineComment", "<ignore>", "</multiLineComment></ignore>", 2);
            inside.multi = false;
        }
        // String interpolation symbol detection
        else if (code[i] === "$" && !Object.values(inside).some(Boolean)) {
            code = code.slice(0, i) + "<strDollar>$</strDollar>" + code.slice(i + 1);
            i += "<strDollar></strDollar>".length;
        }
        // Verbatim string symbol detection
        else if (code[i] === "@" && !Object.values(inside).some(Boolean)) {
            code = code.slice(0, i) + "<strAt>@</strAt>" + code.slice(i + 1);
            i += "<strAt></strAt>".length;
        }
    }

    return code;
}

/**
 * Adds color span tags around specific tags in the code
 * @param {string} code - The source code
 * @param {string} tag - The tag to enhance with color spans
 * @param {string} span - The span tag to insert
 * @return {string} - Code with color spans added
 */
function addColorSpanTags(code, tag, span) {
    return code
        .replaceAll(`<${tag}>`, `<${tag}>${span}`)
        .replaceAll(`</${tag}>`, `</span></${tag}>`);
}

/**
 * Checks if a character is not alphanumeric
 * @param {string} char - Character to check
 * @return {boolean} - True if not alphanumeric
 */
function isNotAlphanumeric(char) {
    return /[^a-zA-Z0-9]/.test(char);
}

/**
 * Detects and tags standard C# keywords in the code
 * This function identifies both state and behavior keywords
 *
 * @param {string} code - The source code to process
 * @return {string} - Code with keywords tagged
 */
function detectStdKeywords(code) {
    const wrap = (keywords, tag) => {
        const ignoreOpen = "<ignore>";
        const ignoreClose = "</ignore>";
        let ignore = false;

        keywords.forEach(keyword => {
            for (let i = 0; i < code.length; i++) {
                // Skip processing sections marked with ignore tags
                if (code.substring(i, i + ignoreOpen.length) === ignoreOpen) ignore = true;
                else if (code.substring(i, i + ignoreClose.length) === ignoreClose) ignore = false;

                if (!ignore && code.substring(i, i + keyword.length) === keyword) {
                    // Check if the next character confirms this is a complete token
                    for (const char of additionalKeywordChars) {
                        const nextChar = code.substring(i + keyword.length, i + keyword.length + char.length);
                        const full = code.substring(i, i + keyword.length + char.length);
                        if (nextChar === char || (nextChar === '\n' && char === ' ')) {
                            // Also check if the previous character confirms this is a complete token
                            const prev = code.substring(i - 1, i);
                            if ((prev && isNotAlphanumeric(prev)) || i === 0) {
                                code = code.substring(0, i) + `<${tag}>${keyword}</${tag}>` + code.substring(i + keyword.length);
                                i += `<${tag}>${keyword}</${tag}>`.length;
                                break;
                            }
                        }
                    }
                }
            }
        });
    };

    // Process state keywords first, then behavior keywords
    wrap(csharpStateSetOfKeywords, "stdKeyword");
    wrap(csharpBehaviorSetOfKeywords, "stdSpecKeyword");

    return code;
}

/**
 * Detects and tags character literals in the code
 * @param {string} code - The source code to process
 * @return {string} - Code with character literals tagged
 */
function detectSeparateChars(code) {
    const ignoreOpen = "<ignore>";
    const ignoreClose = "</ignore>";
    let ignore = false;
    let insideChar = false;

    for (let i = 0; i < code.length; i++) {
        // Skip processing sections marked with ignore tags
        if (code.substring(i, i + ignoreOpen.length) === ignoreOpen) ignore = true;
        else if (code.substring(i, i + ignoreClose.length) === ignoreClose) ignore = false;

        // Character literal detection
        if (!ignore && code[i] === "'") {
            if (!insideChar) {
                code = code.slice(0, i) + "<ignore><chr>" + code.slice(i);
                i += "<ignore><chr>".length;
                insideChar = true;
            } else {
                code = code.slice(0, i + 1) + "</chr></ignore>" + code.slice(i + 1);
                i += "</chr></ignore>".length;
                insideChar = false;
            }
        }
    }

    return code;
}

/**
 * Helper function to collect regex matches from text
 * @param {RegExp} regex - The regular expression to match
 * @param {string} text - The text to search in
 * @return {Array} - Array of matches
 */
function getMatches(regex, text) {
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) matches.push(match);
    return matches;
}

/**
 * Detects and tags static using declarations in the code
 * @param {string} code - The source code to process
 * @return {string} - Code with static using declarations tagged
 */
function detectStaticUsingDeclarations(code) {
    const regex = /static<\/span><\/stdKeyword>\s*([A-Za-z0-9]+(?:\s*\.\s*[A-Za-z0-9]+)+)\s*;/g;

    getMatches(regex, code).forEach(([fullMatch]) => {
        const parts = fullMatch.split('.');
        // Tag the last part of the namespace as a using declaration
        parts[parts.length - 1] = `<usngDecl>${parts.at(-1)}</usngDecl>`;
        code = code.replaceAll(fullMatch, parts.join('.'));
    });

    return code;
}

/**
 * Detects and tags type declarations (class, interface, etc.)
 * @param {string} code - The source code to process
 * @param {string} type - The type of declaration to detect
 * @return {string} - Code with type declarations tagged
 */
function detectTypeDeclarations(code, type) {
    // Match pattern: "type TypeName [<Generic>] [(parameters)] [: BaseType] [where constraints] {"
    const mainRegex = new RegExp(`${type}<\\/span><\\/stdKeyword>\\s*([A-Za-z0-9_]+(?:&lt;[^{]+?(?:&gt;|>))?)\\s*(?:\\([^\\)]*\\))?\\s*(?::\\s*(?:[A-Za-z0-9_&lt;&gt;,\\s]+))?\\s*(?:<stdKeyword><span[^>]*>where<\\/span><\\/stdKeyword>[^{]*?)*\\s*\\{`, "gs");

    getMatches(mainRegex, code).forEach(([fullMatch]) => {
        // Tag capital-case identifiers as type declarations
        const replaced = fullMatch.replace(capitalCharRegex, m => `<${type}Decl>${m}</${type}Decl>`);
        code = code.replaceAll(fullMatch, replaced);
    });

    return code;
}

/**
 * Detects and tags record type declarations
 * Records in C# have their own special syntax patterns
 *
 * @param {string} code - The source code to process
 * @return {string} - Code with record declarations tagged
 */
function detectRecordTypeDeclarations(code) {
    const recordRegex = /record<\/span><\/stdKeyword>.*?(?:;|\{)/gs;

    const processRecordDeclaration = str => {
        const parts = str.includes('(') ? str.split(/\(|\)/) : [str];
        // Process the record name part
        parts[0] = parts[0].replace(capitalCharRegex, m => `<recordDecl>${m}</recordDecl>`) + (str.includes('(') ? '(' : '');
        if (str.includes('(')) {
            // Process the closing part with parameters
            parts[parts.length - 1] = ')' + parts.at(-1).replace(capitalCharRegex, m => `<recordDecl>${m}</recordDecl>`);
        }
        return parts.join('');
    };

    getMatches(recordRegex, code).forEach(([fullMatch]) => {
        const braceCount = (fullMatch.match(/\(/g) || []).length;

        // Handle different record declaration patterns
        if (braceCount === 1) {
            code = code.replaceAll(fullMatch, processRecordDeclaration(fullMatch));
        } else if (braceCount === 0) {
            code = code.replaceAll(fullMatch, fullMatch.replace(capitalCharRegex, m => `<recordDecl>${m}</recordDecl>`));
        } else {
            // Handle record inheritance with ":" syntax
            const [beforeColon, afterColon] = fullMatch.split(" :");
            const newMatch = `${processRecordDeclaration(beforeColon)} :${processRecordDeclaration(afterColon)}`;
            code = code.replaceAll(fullMatch, newMatch);
        }
    });

    return code;
}

/**
 * Detects and tags attribute decorators in the code
 * Attributes are enclosed in square brackets and often use PascalCase
 *
 * @param {string} code - The source code to process
 * @return {string} - Code with attributes tagged
 */
function detectAttributes(code) {
    const attrRegex = /\[(.*?)\]/g;
    const ignoreTagsRegex = /(<ignore>.*?<\/ignore>)/s;
    const capitalRegex = /(?<!\.)\b[A-Z][a-zA-Z0-9_]*/g;

    getMatches(attrRegex, code)
        .filter(([fullMatch]) => fullMatch !== "[]") // Skip empty brackets
        .forEach(([fullMatch]) => {
            // Process parts outside of ignore tags
            const parts = fullMatch.split(ignoreTagsRegex).map(part =>
                part.startsWith("<ignore>") ? part : part.replace(capitalRegex, m => `<attr>${m}</attr>`)
            );
            code = code.replaceAll(fullMatch, parts.join(''));
        });

    return code;
}

/**
 * Helper function to collect matches from multiple regexes
 * @param {string} code - The source code
 * @param {Array} regexes - Array of regular expressions
 * @return {Array} - Combined array of matches
 */
function collectMatches(code, regexes) {
    const matches = [];
    for (const regex of regexes) {
        let match;
        while ((match = regex.exec(code)) !== null) {
            matches.push(match);
        }
    }
    return matches;
}

/**
 * Helper function to replace matches with a custom function
 * @param {string} code - The source code
 * @param {Array} matches - Array of matches
 * @param {Function} replacer - Function to transform each match
 * @return {string} - Code with replacements applied
 */
function replaceMatches(code, matches, replacer) {
    for (const match of matches) {
        const newMatch = replacer(match[0]);
        code = code.replaceAll(match[0], newMatch);
    }
    return code;
}

/**
 * Detects and tags constructor invocations using the "new" keyword
 * @param {string} code - The source code to process
 * @return {string} - Code with constructor invocations tagged
 */
function detectConstructorInvocations(code) {
    // Match pattern: "new" keyword followed by type name and ending with semicolon
    const regex = /new<\/span><\/stdKeyword>[\s\S]*?(?<!t);/g;
    let matches = collectMatches(code, [regex]);

    // Filter out array initializations and empty constructor calls
    matches = matches.filter(item =>
        !item[0].startsWith("new</span></stdKeyword>()") &&
        !item[0].includes("[") &&
        !item[0].includes("]")
    );

    return replaceMatches(code, matches, (match) => {
        const str = match;
        // Find the type name after the "new" keyword
        const start = str.indexOf("</stdKeyword>") + "</stdKeyword>".length;
        let end = str.indexOf("&lt;"); // Handle generic type
        if (end === -1) end = str.indexOf("("); // Handle constructor parameters
        if (end === -1) end = str.indexOf("{"); // Handle object initializers

        const target = str.substring(start, end);
        // Handle qualified names (with dots)
        if (target.includes(".")) {
            const sub = target.substring(target.lastIndexOf(".") + 1);
            const replaced = target.replace(sub, `<cnstrInvc>${sub}</cnstrInvc>`);
            return str.replace(target, replaced);
        }

        // Handle simple type names
        const replaced = target.replaceAll(capitalCharRegex, item => `<cnstrInvc>${item}</cnstrInvc>`);
        return str.replace(target, replaced);
    });
}
/**
 * Detects property declarations in C# code and wraps them with marker tags.
 * Looks for patterns like "Property => value" and "Property { get..."
 * @param {string} code - Source code to parse
 * @return {string} Modified code with tagged property declarations
 */
function detectPropertyDeclarations(code) {
    const regexes = [
        /\b[A-Z][a-zA-Z0-9]*\s*=&gt;/g,  // Expression-bodied property syntax
        /\b[A-Z][a-zA-Z0-9]*\s*\{\s*<stdKeyword>(?:.*?)get/g  // Standard property with getter
    ];

    const matches = collectMatches(code, regexes);

    return replaceMatches(code, matches, str =>
        str.replace(capitalCharRegex, item => `<propertyDeclr>${item}</propertyDeclr>`)
    );
}

/**
 * Identifies non-generic variable assignment patterns where a type is followed by a variable name.
 * Example: "String name = ..."
 * @param {string} code - Source code to parse
 * @return {string} Modified code with tagged variable assignments
 */
function detectVariableNewAssignmentsNonGeneric(code) {
    const regex = /\b[A-Z][a-zA-Z0-9]*\s+[a-z][a-zA-Z0-9]*\s*=\s*/g;
    const matches = collectMatches(code, [regex])
        .filter(item => item[0].includes("="));

    return replaceMatches(code, matches, str =>
        str.replace(capitalCharRegex, item => `<varNewAssignmentNG>${item}</varNewAssignmentNG>`)
    );
}

/**
 * Detects and tags non-generic method calls and constructors.
 * Distinguishes between method calls on objects and potential constructor invocations.
 * @param {string} theCode - Source code to analyze
 * @return {string} Code with tagged non-generic methods and constructors
 */
function detectNonGenericMethods(theCode) {
    const potentialNameRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
    const classNameRegex = /<classDecl>.*?>(.*?)<\/span><\/classDecl>/g;

    // Extract class names from previously tagged class declarations
    const classNames = new Set([...theCode.matchAll(classNameRegex)]
        .map(m => m[1]?.replace(/<[^>]*>/g, '')).filter(Boolean));

    // Find potential method/constructor calls
    const validNameLocations = [...theCode.matchAll(potentialNameRegex)].flatMap(nameMatch => {
        const [fullMatch, name] = nameMatch;
        const start = nameMatch.index;
        const end = start + name.length;

        // Skip if inside ignored tags
        if (isInsideIgnoreTags({ index: start, text: name }, theCode)) return [];

        // Examine context characters to determine type
        let precedingChar = '', followingChar = '';
        let i = start - 1;
        while (i >= 0 && /\s/.test(theCode[i])) i--;
        if (i >= 0) {
            precedingChar = theCode[i];
            if (precedingChar === '>') {
                let tagStart = theCode.lastIndexOf('<', i - 1);
                let j = tagStart - 1;
                while (j >= 0 && /\s/.test(theCode[j])) j--;
                precedingChar = j >= 0 ? theCode[j] : '';
            }
        }

        let j = end;
        while (j < theCode.length && /\s/.test(theCode[j])) j++;
        if (j < theCode.length) followingChar = theCode[j];

        let matchType = null;
        if (followingChar === '(') {
            matchType = precedingChar === '.' ? 'dotMethod' : 'potentialConstructorOrMethod';
        }

        return matchType ? [{ name, nameStartIndex: start, nameEndIndex: end, type: matchType }] : [];
    });

    // Sort in reverse order to avoid index shifting when replacing
    validNameLocations.sort((a, b) => b.nameStartIndex - a.nameStartIndex);

    // Replace matches with appropriate tags
    let modifiedCode = theCode;
    for (const loc of validNameLocations) {
        const { name, nameStartIndex: start, nameEndIndex: end, type } = loc;
        const segment = modifiedCode.substring(start, end);
        if (segment !== name) continue;

        const tag = type === 'potentialConstructorOrMethod' && classNames.has(name) ? 'constrNG' : 'methodNG';
        const replacement = `<${tag}>${name}</${tag}>`;
        modifiedCode = modifiedCode.slice(0, start) + replacement + modifiedCode.slice(end);
    }

    return modifiedCode;
}

/**
 * Determines if a specific text segment falls within ignored tag regions.
 * @param {Object} position - Contains index and text properties of the segment to check
 * @param {string} fullText - The complete code being analyzed
 * @return {boolean} True if the segment is inside ignored tags
 */
function isInsideIgnoreTags({ index, text }, fullText) {
    if (typeof text !== 'string') return false;
    const end = index + text.length;
    const ignoreRegex = /<ignore>([\s\S]*?)<\/ignore>/g;
    for (const match of fullText.matchAll(ignoreRegex)) {
        const start = match.index + '<ignore>'.length;
        const stop = match.index + match[0].length - '</ignore>'.length;
        if (index >= start && end <= stop) return true;
    }
    return false;
}

/**
 * Identifies and tags static class references (e.g., "Console.WriteLine").
 * Handles edge cases like nested namespaces and multi-dot expressions.
 * @param {string} theCode - Source code to process
 * @return {string} Modified code with tagged static class names
 */
function detectStaticClassNames(theCode) {
    const staticClassNameRegex = /\b[A-Z][a-zA-Z0-9_]*\s*\n*\s*\./g;
    const moreThan1DotRegex = /\b\w+(\s*\.\s*\w+){1,}\s*\./g;

    // Preserve namespace section separately
    const nsIndex = theCode.indexOf("namespace");
    const head = theCode.slice(0, nsIndex);
    let body = theCode.slice(nsIndex);

    // Find multi-dot spans to avoid processing them incorrectly
    const multiDotSpans = [...body.matchAll(moreThan1DotRegex)].map(m => ({
        start: m.index, end: m.index + m[0].length
    }));

    // Find and process static class names
    const matches = [...body.matchAll(staticClassNameRegex)].filter(m =>
        !multiDotSpans.some(r => m.index >= r.start && m.index <= r.end)
    ).sort((a, b) => b.index - a.index);

    for (const match of matches) {
        if (!isInsideIgnoreTags({ index: match.index, text: match[0] }, body)) {
            const wrapped = match[0].replace(capitalCharRegex, t => `<staticCN>${t}</staticCN>`);
            body = body.slice(0, match.index) + wrapped + body.slice(match.index + match[0].length);
        }
    }

    return head + body;
}

/**
 * Detects generic method invocations (e.g., "List.Find<T>").
 * Identifies methods followed by generic type parameters.
 * @param {string} theCode - Source code to analyze
 * @return {string} Code with tagged generic method calls
 */
function detectGenericMethodsInvocation(theCode) {
    const genericMethodRegex = /\.(\w+)(?:\s+)?&lt;/g;
    const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

    for (const match of theCode.matchAll(genericMethodRegex)) {
        const wrapped = match[0].replace(capitalCharRegex, t => `<methodGInvc>${t}</methodGInvc>`);
        theCode = theCode.replaceAll(match[0], wrapped);
    }

    return theCode;
}

/**
 * Utility function to find all regex matches in text.
 * @param {RegExp} regex - Regular expression to match
 * @param {string} text - Text to search
 * @return {Array} Array of matches
 */
function findAllMatches(regex, text) {
    let match, matches = [];
    while ((match = regex.exec(text)) !== null) matches.push(match);
    return matches;
}

/**
 * Filters out matches that are inside ignored tag regions.
 * @param {Array} matches - Array of matches to filter
 * @param {string} text - Source text
 * @return {Array} Filtered matches
 */
function filterIgnoreTags(matches, text) {
    return matches.filter(item => !isInsideIgnoreTags(item, text));
}

/**
 * Sorts matches by descending index to avoid index shifts during replacement.
 * @param {Array} matches - Array of matches to sort
 * @return {Array} Sorted matches
 */
function sortByDescendingIndex(matches) {
    return matches.sort((a, b) => b.index - a.index);
}

/**
 * Replaces a text segment in the source string.
 * @param {string} text - Source text
 * @param {Object} item - Match item with index and text
 * @param {string} newText - Replacement text
 * @return {string} Modified text
 */
function spliceReplace(text, item, newText) {
    return text.substring(0, item.index) + newText + text.substring(item.index + item.text.length);
}

/**
 * Applies regex replacements to matched segments in code.
 * @param {Array} matches - Array of matches
 * @param {RegExp} regex - Regex for finding elements within matches
 * @param {Function} replacer - Replacement function
 * @param {string} code - Source code
 * @return {string} Modified code
 */
function highlightRegexMatches(matches, regex, replacer, code) {
    for (const item of matches) {
        const newMatch = item.text.replace(regex, replacer);
        code = spliceReplace(code, item, newMatch);
    }
    return code;
}

/**
 * Identifies tuple type references in the code.
 * Detects patterns like "(Type1, Type2, Type3)".
 * @param {string} theCode - Source code
 * @return {string} Code with tagged tuple references
 */
function detectSimpleTuples(theCode) {
    const tuplesRegex = /\(\s*([A-Z][a-zA-Z]*\s*,\s*)+[A-Z][a-zA-Z]*\s*\)/g;

    return theCode.replace(tuplesRegex, match =>
        match.replace(capitalCharRegex, str => `<tuple>${str}</tuple>`)
    );
}

/**
 * Detects generic variable declaration patterns.
 * Identifies types followed by generic type parameters.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged generic variable declarations
 */
function detectGenericVarDeclarations(theCode) {
    const classWithGen = /(?:^|\s)([A-Z][a-zA-Z0-9_]*)\s*(?=&lt;)/g;
    const methodWithGen = /(\S+)(?:\s+)([A-Z][a-zA-Z0-9_]*\s*&lt;)/g;

    const classMatches = [...theCode.matchAll(classWithGen)].map(m => ({
        text: m[1],
        index: m.index + m[0].indexOf(m[1])
    }));

    const methodMatches = [...theCode.matchAll(methodWithGen)]
        .filter(m => !m[0].includes("span") && !m[0].includes("}") && !m[0].includes("{") && !m[0].includes(","))
        .map(m => m[2].replaceAll("&lt;", "").trim());

    // Filter out class matches that overlap with method matches
    const filteredMatches = classMatches.filter(cls =>
        !methodMatches.includes(cls.text.trim())
    );

    // Sort in reverse to prevent index shifting
    filteredMatches.sort((a, b) => b.index - a.index);

    for (const match of filteredMatches) {
        if (!isInsideIgnoreTags(match, theCode)) {
            const wrapped = `<varGDecl>${match.text}</varGDecl>`;
            theCode = theCode.slice(0, match.index) + wrapped + theCode.slice(match.index + match.text.length);
        }
    }

    return theCode;
}

/**
 * Detects generic method declarations in the code.
 * Identifies methods with generic type parameters.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged generic method declarations
 */
function detectGenericMethods(theCode) {
    const regex = /[ \t\r\n]*([A-Z][A-Za-z0-9]*)[ \t\r\n]*&lt;[\s\S]*?&gt;[ \t\r\n]*\(/g;

    let matches = findAllMatches(regex, theCode).filter(m => !isInsideIgnoreTags(m, theCode));

    for (const item of matches) {
        const newMatch = item[0].replace(item[1], str => `<methodGDecl>${str}</methodGDecl>`);
        theCode = theCode.replaceAll(item[0], newMatch);
    }

    return theCode;
}

/**
 * Detects field declarations in classes.
 * Identifies patterns where a type name is followed by a variable name.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged field declarations
 */
function detectFieldsDeclaration(theCode) {
    const regex = /([A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*)\s+([a-z_][a-zA-Z0-9_]*)\b/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capitalCharRegex, str =>
            // Use different tag for single-letter type parameters (like T, K)
            (str.length === 1 && str >= 'A' && str <= 'Z')
                ? `<typeParam>${str}</typeParam>` : `<varInstance>${str}</varInstance>`,
        theCode
    );
}

/**
 * Identifies return value types for non-generic methods.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged return value types
 */
function detectReturnValueMethodNG(theCode) {
    const regex = /\b(\w+)\s+<methodNG>/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capitalCharRegex, str => `<returnValueMethodNG>${str}</returnValueMethodNG>`, theCode);
}

/**
 * Identifies return value types for generic methods.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged return value types
 */
function detectReturnValueMethodG(theCode) {
    const regex = /\b(\w+)\s+<methodGDecl>/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capitalCharRegex, str => `<returnValueMethodG>${str}</returnValueMethodG>`, theCode);
}

/**
 * Processes generic brackets content to tag type names inside them.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged generic type names
 */
function detectGenericBrackets(theCode) {
    const regex = /&lt;[^]*?&gt;/g;
    const capRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

    let matches = findAllMatches(regex, theCode)
        .map(m => ({ text: m[0], index: m.index }))
        .filter(m =>
            // Filter out non-type references
            !m.text.includes("stdKeyword") &&
            !m.text.includes("span") &&
            !m.text.includes("=") &&
            !m.text.includes("/") &&
            !m.text.includes("summary")
        );

    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capRegex, str => `<gTypeName>${str}</gTypeName>`, theCode);
}

/**
 * Identifies property type declarations.
 * @param {string} theCode - Source code
 * @return {string} Code with tagged property types
 */
function detectPropertyType(theCode) {
    const regex = /\b(\w+)\s+<propertyDeclr>/g;
    const capRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capRegex, str => `<propTypeName>${str}</propTypeName>`, theCode);
}

/**
 * Identifies property type declarations.
 *
 * Finds words preceding <propertyDeclr> tags and wraps capitalized identifiers
 * in <propTypeName> tags.
 *
 * @param {string} theCode - Source code to process
 * @return {string} Code with tagged property types
 */
function detectPropertyType(theCode) {
    // Match any word followed by space and <propertyDeclr> tag
    const regex = /\b(\w+)\s+<propertyDeclr>/g;
    const capRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capRegex, str => `<propTypeName>${str}</propTypeName>`, theCode);
}

/**
 * Detects and tags return value names in composite method declarations.
 *
 * Finds words preceding <staticCN> tags that start with a capital letter and
 * wraps them in appropriate tags.
 *
 * @param {string} theCode - Source code to process
 * @return {string} Code with tagged return value names
 */
function detectReturnValueCompositeMethodName(theCode) {
    // Match any word followed by space and <staticCN> tag
    const regex = /\b\w+\b <staticCN>/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capitalCharRegex, str => `<returnValueCompositeMethodName>${str}</returnValueCompositeMethodName>`, theCode);
}

/**
 * Detects types used with special keywords.
 *
 * Finds capitalized identifiers inside parentheses that follow a closing
 * standard keyword tag and wraps them in appropriate tags.
 *
 * @param {string} theCode - Source code to process
 * @return {string} Code with tagged special keyword types
 */
function detectTypeWithSpecKeyword(theCode) {
    // Match closing stdKeyword tag followed by parenthesized capitalized identifier
    const regex = /<\/stdKeyword>\([A-Z][a-zA-Z0-9_]*\)/g;

    let matches = findAllMatches(regex, theCode).map(m => ({ text: m[0], index: m.index }));
    matches = sortByDescendingIndex(filterIgnoreTags(matches, theCode));

    return highlightRegexMatches(matches, capitalCharRegex, str => `<typeWithSpecKeyword>${str}</typeWithSpecKeyword>`, theCode);
}

/**
 * Main function that applies syntax highlighting to C# code.
 * Processes the code through multiple detection functions to identify and tag code elements.
 * @param {string} theCode - Source C# code
 * @return {string} HTML with syntax highlighted code
 */
function colorize(theCode) {
    const divPreStart = '<div style="background: #ffffff; overflow:auto;width:auto;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%">';
    const divPreEnd = '</pre></div>';

    // Initial code processing
    theCode = specialCharsShielding(theCode);
    theCode = detectCommentsAndStrings(theCode);

    // Apply color styles to basic elements (comments, strings)
    const colorTagMap = [
        ["oneLineComment", "#008000"],
        ["docComment", "#90b493"],
        ["str", "#d6092d"],
        ["multiLineComment", "#008000"],
        ["strDollar", "#913831"],
        ["strAt", "#913831"],
    ];
    colorTagMap.forEach(([cls, color]) => {
        theCode = addColorSpanTags(theCode, cls, `<span style="color: ${color}">`);
    });

    // Process code characters and keywords
    theCode = detectSeparateChars(theCode);
    theCode = addColorSpanTags(theCode, "chr", '<span style="color: #ff3131">');

    theCode = detectStdKeywords(theCode);
    theCode = addColorSpanTags(theCode, "stdKeyword", '<span style="color: #0000ff">');
    theCode = addColorSpanTags(theCode, "stdSpecKeyword", '<span style="color: #c204b2">');

    // Process declarations and structural elements
    theCode = detectStaticUsingDeclarations(theCode);
    theCode = addColorSpanTags(theCode, "usngDecl", '<span style="color: #0b856c">');

    const typeDecls = [
        ["class", "classDecl"],
        ["struct", "structDecl"],
        ["interface", "interfaceDecl"],
        ["enum", "enumDecl"],
    ];
    typeDecls.forEach(([type, cls]) => {
        theCode = detectTypeDeclarations(theCode, type);
        theCode = addColorSpanTags(theCode, cls, '<span style="color: #419db8">');
    });

    theCode = detectRecordTypeDeclarations(theCode);
    theCode = addColorSpanTags(theCode, "recordDecl", '<span style="color: #419db8">');

    theCode = detectAttributes(theCode);
    theCode = addColorSpanTags(theCode, "attr", '<span style="color: #2d8ca8">');

    // Process property, method, and class elements
    theCode = detectPropertyDeclarations(theCode);

    theCode = detectConstructorInvocations(theCode);
    theCode = addColorSpanTags(theCode, "cnstrInvc", '<span style="color: #419db8">');

    theCode = detectVariableNewAssignmentsNonGeneric(theCode);
    theCode = addColorSpanTags(theCode, "varNewAssignmentNG", '<span style="color: #419db8">');

    theCode = detectNonGenericMethods(theCode);
    theCode = addColorSpanTags(theCode, "constrNG", '<span style="color: #419db8">');
    theCode = addColorSpanTags(theCode, "methodNG", '<span style="color: #964b00">');

    theCode = detectStaticClassNames(theCode);
    theCode = addColorSpanTags(theCode, "staticCN", '<span style="color: #419db8">');

    theCode = detectGenericMethodsInvocation(theCode);
    theCode = addColorSpanTags(theCode, "methodGInvc", '<span style="color: #964b00">');

    theCode = detectSimpleTuples(theCode);
    theCode = addColorSpanTags(theCode, "tuple", '<span style="color: #5ab6d1">');

    theCode = detectGenericVarDeclarations(theCode);
    theCode = addColorSpanTags(theCode, "varGDecl", '<span style="color: #419db8">');

    theCode = detectFieldsDeclaration(theCode);
    theCode = addColorSpanTags(theCode, "varInstance", '<span style="color: #419db8">');
    theCode = addColorSpanTags(theCode, "typeParam", '<span style="color: #bbe4f0">');

    theCode = detectGenericMethods(theCode);
    theCode = addColorSpanTags(theCode, "methodGDecl", '<span style="color: #964b00">');

    theCode = detectReturnValueMethodNG(theCode);
    theCode = addColorSpanTags(theCode, "returnValueMethodNG", '<span style="color: #419db8">');

    theCode = detectReturnValueMethodG(theCode);
    theCode = addColorSpanTags(theCode, "returnValueMethodG", '<span style="color: #419db8">');

    theCode = detectGenericBrackets(theCode);
    theCode = addColorSpanTags(theCode, "gTypeName", '<span style="color: #419db8">');

    theCode = detectPropertyType(theCode);
    theCode = addColorSpanTags(theCode, "propTypeName", '<span style="color: #419db8">');

    theCode = detectReturnValueCompositeMethodName(theCode);
    theCode = addColorSpanTags(theCode, "returnValueCompositeMethodName", '<span style="color: #419db8">');

    theCode = detectTypeWithSpecKeyword(theCode);
    theCode = addColorSpanTags(theCode, "typeWithSpecKeyword", '<span style="color: #419db8">');

    return `${divPreStart}${theCode}${divPreEnd}`;
}

/**
 * Event handler for the Convert button.
 * Gets input code, processes it, and displays the result.
 */
function convert() {
    const input = document.getElementById('csharp_source_code');
    const output = document.getElementById('csharp_source_code_converted_into_html');
    const preview = document.getElementById('previewOutput');
    const previewResult = document.getElementById('finalResultPreview');

    const code = input.value;

    if (!code) {
        output.value = "";
        preview.style.display = 'none';
        return;
    }

    const colorizedCode = colorize(code);
    output.value = colorizedCode;
    previewResult.innerHTML = colorizedCode;
    preview.style.display = 'block';
}