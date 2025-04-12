    const csharpStateSetOfKeywords =
    [
        "async", "assembly", "await", "using", "in", "as", "abstract", "base", "bool", "break", "byte",
        "catch", "char", "checked", "class", "const", "continue", "fixed", "bool?", "module",
        "decimal", "default", "delegate", "do", "double", "double?", "sizeof", "nameof",
        "enum", "explicit", "extern", "event", "false", "finally", "stackalloc", "mod",
        "float", "float?", "goto", "implicit", "static", "partial", "case", "readonly",
        "interface", "internal", "lock", "long", "long?", "unit", "get", "set", "record",
        "namespace", "new", "int", "int?", "null", "object", "object?", "operator", "out", "ulong",
        "override", "params", "private", "protected", "public", "unchecked", "where",
        "ref", "sbyte", "init", "sealed", "short", "string", "string?", "virtual",
        "struct", "switch", "this", "with", "true", "try", "void", "var", "value",
        "unsafe", "ushort", "typeof", "volatile", "is", "required", "when", "global"
    ];

    const csharpBehaviorSetOfKeywords =
    [
        "return", "if", "while", "foreach", "for", "throw", "else"
    ];

    const specialChars = {
        "<" : "&lt;",
        ">" : "&gt;"
    };

    const additionalKeywordChars =
    [
        " ", "[", "]", "(", ")", "=", ".", "{", "}", ";", "/", ",", "&gt;", ":"
    ];

    function specialCharsShielding(theCode) {

        for (const [sc, schtml] of Object.entries(specialChars)) {
            theCode = theCode.replaceAll(sc, schtml);
        }

        return theCode;
    }

    // Refactor later, split into several functions : a separate one for comments, a one for strings, another one for multi-line comments and doc comments
    function detectCommentsAndStrings(theCode) {

        let insideTheString = false;
        let insideTheSingleLineComment = false;
        let insideTheMultiLineComment = false;
        let insideTheDocComment = false;

        for (let index = 0; index < theCode.length - 4; index++) {

            let twoCharsInSequence = theCode.substring(index, index + 2);
            let fourCharsInSequence = theCode.substring(index, index + 4);

            if (twoCharsInSequence === "//"
            && fourCharsInSequence !== "/// "
            && !insideTheString
            && !insideTheSingleLineComment
            && !insideTheMultiLineComment
            && !insideTheDocComment) {

                insideTheSingleLineComment = true;

                theCode = theCode.slice(0, index) + "<ignore><oneLineComment>" + theCode.slice(index);
                index += "<ignore><oneLineComment>".length;
            }
            else
            if (theCode[index] === "\n" && insideTheSingleLineComment) {

                insideTheSingleLineComment = false;

                theCode = theCode.slice(0, index) + "</oneLineComment></ignore>" + theCode.slice(index);
                index += "</oneLineComment></ignore>".length;
            }
            else
            if (fourCharsInSequence === "/// "
            && !insideTheString
            && !insideTheSingleLineComment
            && !insideTheMultiLineComment
            && !insideTheDocComment) {

                insideTheDocComment = true;

                theCode = theCode.slice(0, index) + "<ignore><docComment>" + theCode.slice(index);
                index += "<ignore><docComment>".length;
            }
            else
            if (theCode[index] === "\n" && insideTheDocComment) {

                insideTheDocComment = false;

                theCode = theCode.slice(0, index) + "</docComment></ignore>" + theCode.slice(index);
                index += "</docComment></ignore>".length;
            }
            else
            if(theCode[index] === "\"" && !insideTheString && !insideTheSingleLineComment && !insideTheMultiLineComment && !insideTheDocComment) {

                insideTheString = true;

                theCode = theCode.slice(0, index) + "<ignore><str>" + theCode.slice(index);
                index += "<ignore><str>".length;
            }
            else
            if(theCode[index] === "\"" && theCode[index - 1] === "\\" && insideTheString && !insideTheSingleLineComment && !insideTheMultiLineComment && !insideTheDocComment) {
            }
            else
            if(theCode[index] === "\"" && insideTheString && !insideTheSingleLineComment && !insideTheMultiLineComment && !insideTheDocComment) {

                insideTheString = false;

                theCode = theCode.slice(0, index + 1) + "</str></ignore>" + theCode.slice(index + 1); // 1 is length of "
                index += "</str></ignore>".length;
            }
            else
            if(twoCharsInSequence === "/*" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && !insideTheMultiLineComment) {

                insideTheMultiLineComment = true;

                theCode = theCode.slice(0, index) + "<ignore><multiLineComment>" + theCode.slice(index);
                index += "<ignore><multiLineComment>".length;
            }
            else
            if(twoCharsInSequence === "*/" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && insideTheMultiLineComment) {

                insideTheMultiLineComment = false;

                theCode = theCode.slice(0, index + 2) + "</multiLineComment></ignore>" + theCode.slice(index + 2); // 2 is length of */
                index += "</multiLineComment></ignore>".length;
            }
            else
            if(theCode[index] === "$" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && !insideTheMultiLineComment) {

                theCode = theCode.slice(0, index) + "<strDollar>" + theCode.slice(index, index + 1) + "</strDollar>" + theCode.slice(index + 1); // 1 is length of $
                index = index + "<strDollar>".length + "</strDollar>".length;
            }
            else
            if(theCode[index] === "@" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && !insideTheMultiLineComment) {

                theCode = theCode.slice(0, index) + "<strAt>" + theCode.slice(index, index + 1) + "</strAt>" + theCode.slice(index + 1); // 1 is length of $
                index = index + "<strAt>".length + "</strAt>".length;
            }
        }

        return theCode;
    }

    function addColorSpanTags(theCode, tag, span) {

        theCode = theCode.replaceAll(`<${tag}>`, `<${tag}>${span}`);
        theCode = theCode.replaceAll(`</${tag}>`, `</span></${tag}>`);

        return theCode;
    }

    function isNotAlphanumeric(char) {
        return /[^a-zA-Z0-9]/.test(char);
    }

    function detectStdKeywords(theCode) {

        let wrap = (keywords, tag) => {

            let ignoreOpenLength = "<ignore>".length;
            let ignoreCloseLength = "</ignore>".length;

            let ignore = false;

            keywords.forEach(keyword => {

                for(let i = 0; i <= theCode.length; i++) {

                    if(theCode.substring(i, i + ignoreOpenLength) === "<ignore>") {
                        ignore = true;
                    }
                    else
                    if(theCode.substring(i, i + ignoreCloseLength) === "</ignore>") {
                        ignore = false;
                    }

                    if(theCode.substring(i, i + keyword.length) === keyword && !ignore) {

                        additionalKeywordChars.forEach(char => {

                            if(
                                (theCode.substring(i, i + keyword.length + char.length) === keyword + char) ||
                                (theCode.substring(i + keyword.length, i + keyword.length + char.length) === '\n' && char === ' ')) {

                                let theCharBeforeTheKeyword = theCode.substring(i - 1, i);

                                if(theCharBeforeTheKeyword !== "" && isNotAlphanumeric(theCharBeforeTheKeyword) || (i === 0 && theCharBeforeTheKeyword === '')) {

                                    theCode = theCode.substring(0, i) + `<${tag}>${keyword}</${tag}>` + theCode.substring(i + keyword.length, theCode.length);
                                    i += `<${tag}>${keyword}</${tag}>`.length + 1;

                                }
                            }
                        });
                    }
                }
            });
        };

        wrap(csharpStateSetOfKeywords, "stdKeyword");
        wrap(csharpBehaviorSetOfKeywords, "stdSpecKeyword");

        return theCode;
    }

    function detectSeparateChars(theCode) {

        let ignoreOpenLength = "<ignore>".length;
        let ignoreCloseLength = "</ignore>".length;

        let ignore = false;
        let insideChar = false;

        for(let i = 0; i <= theCode.length; i++) {

            if(theCode.substring(i, i + ignoreOpenLength) === "<ignore>") {
                ignore = true;
            }
            else
            if(theCode.substring(i, i + ignoreCloseLength) === "</ignore>") {
                ignore = false;
            }

            if(theCode[i] === "'" && !ignore && !insideChar) {

                insideChar = true;

                theCode = theCode.slice(0, i) + "<ignore><chr>" + theCode.slice(i);
                i += "<ignore><chr>".length;
            }
            else
            if(theCode[i] === "'" && !ignore && insideChar) {

                insideChar = false;

                theCode = theCode.slice(0, i + 1) + "</chr></ignore>" + theCode.slice(i + 1);
                i += "</chr></ignore>".length;
            }
        }

        return theCode;
    }

    function detectStaticUsingDeclarations(theCode) {
        const staticHtmlRegexp = /static<\/span><\/stdKeyword>\s*([A-Za-z0-9]+(?:\s*\.\s*[A-Za-z0-9]+)+)\s*;/g;
        const matches = [];

        let match;

        while ((match = staticHtmlRegexp.exec(theCode)) !== null) {
            matches.push(match);
        }

        matches.forEach(match => {

            let splitMatch = match[0].split(".");

            splitMatch[splitMatch.length - 1] = "<usngDecl>" + splitMatch[splitMatch.length - 1] + "</usngDecl>";

            let newMatch = splitMatch.join(".");

            theCode = theCode.replaceAll(match[0], newMatch);

        });

        return theCode;
    }

    function detectTypeDeclarations(theCode, type) {

        const staticHtmlRegexp = new RegExp(`${type}<\\/span><\\/stdKeyword>\\s*([A-Za-z0-9_]+(?:&lt;[^{]+?(?:&gt;|>))?)\\s*(?:\\([^\\)]*\\))?\\s*(?::\\s*(?:[A-Za-z0-9_&lt;&gt;,\\s]+))?\\s*(?:<stdKeyword><span[^>]*>where<\\/span><\\/stdKeyword>[^{]*?)*\\s*\\{`, "gs");
        const staticHtmlCapitalCaseRegExp = /\b[A-Z][a-zA-Z0-9_]*\b/g;
        const matches = [];

        let match;

        while ((match = staticHtmlRegexp.exec(theCode)) !== null) {
            matches.push(match);
        }

        matches.forEach(match => {

            let newMatch = match[0].replace(staticHtmlCapitalCaseRegExp, (match) => `<${type}Decl>${match}</${type}Decl>`);

            theCode = theCode.replaceAll(match[0], newMatch);

        });

        return theCode;
    }

    function detectRecordTypeDeclarations(theCode) {

        const htmlRecordDeclarationRegex = /record<\/span><\/stdKeyword>.*?(?:;|\{)/gs;
        const staticHtmlCapitalCaseRegExp = /\b[A-Z][a-zA-Z0-9_]*\b/g;
        const matches = [];

        let match;

        while ((match = htmlRecordDeclarationRegex.exec(theCode)) !== null) {
            matches.push(match);
        }

        function processRecordDeclaration(recordString) {
            let splitMatch = recordString.includes('(') ? recordString.split(/\(|\)/) : [recordString];
            splitMatch[0] = splitMatch[0].replace(staticHtmlCapitalCaseRegExp, (match) => `<recordDecl>${match}</recordDecl>`) + "(";
            splitMatch[splitMatch.length - 1] = ")" + splitMatch[splitMatch.length - 1].replace(staticHtmlCapitalCaseRegExp, (match) => `<recordDecl>${match}</recordDecl>`);
            return splitMatch.join('');
        }

        matches.forEach(match => {

            let bracesCount = (match[0].match(/\(/g) || []).length;

            if (bracesCount === 1) {
                theCode = theCode.replaceAll(match[0], processRecordDeclaration(match[0]));
            } else if (bracesCount < 1) {
                theCode = theCode.replaceAll(match[0], match[0].replace(staticHtmlCapitalCaseRegExp, (match) => `<recordDecl>${match}</recordDecl>`));
            } else if (bracesCount >= 1) {
                let splitByColon = match[0].split(" :");

                splitByColon[0] = processRecordDeclaration(splitByColon[0]);
                splitByColon[1] = processRecordDeclaration(splitByColon[1]);

                let newMatch = splitByColon.join(' :');

                theCode = theCode.replaceAll(match[0], newMatch);
            }

        });

        return theCode;
    }

    // TO DO: Add detection if it's all inside <ignore></ignore>
    function detectAttributes(theCode) {
        const attributeRegex = /\[(.*?)\]/g;
        const ignoreTagsRegExp = /(<ignore>.*?<\/ignore>)/s;
        const capitalCharButNotPreceededByDotRegExp = /(?<!\.)\b[A-Z][a-zA-Z0-9_]*/g;
        const matches = [];

        let match;

        while ((match = attributeRegex.exec(theCode)) !== null) {
            matches.push(match);
        }

        let matchesRefined = matches.filter(item => item[0] !== "[]");

        matchesRefined.forEach(match => {

            let newAttribute = [];

            const matchesSplitByIgnoreTags = match[0].split(ignoreTagsRegExp);

            matchesSplitByIgnoreTags.forEach(item => {

                if (!item.startsWith("<ignore>")) {

                    newAttribute.push(item.replace(capitalCharButNotPreceededByDotRegExp, (attrMatch) => `<attr>${attrMatch}</attr>`));

                }
                else {
                    newAttribute.push(item);
                }

            });

            let newMatch = newAttribute.join('');

            theCode = theCode.replaceAll(match[0], newMatch);
        });

        return theCode;
    }

    function detectConstructorInvocations(theCode) {
        const constructorInvocationRegex = /new<\/span><\/stdKeyword>[\s\S]*?(?<!t);/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;
        let matchesCnstrs = [];

        // Find all constructor invocations
        let matchConstructor;
        while ((matchConstructor = constructorInvocationRegex.exec(theCode)) !== null) {
            matchesCnstrs.push(matchConstructor);
        }

        // Filter out invalid matches
        matchesCnstrs = matchesCnstrs
            .filter(item => !item[0].startsWith("new</span></stdKeyword>()"))
            .filter(item => !item[0].includes("[") && !item[0].includes("]"));

        // Process each match
        matchesCnstrs.forEach(match => {
            const startIndex = match[0].indexOf("</stdKeyword>");
            const stdKeywordLength = "</stdKeyword>".length;

            // Determine the end index based on presence of angle brackets or parentheses
            const hasAngleBracket = match[0].includes("&lt;");
            let endIndex = hasAngleBracket ? match[0].indexOf("&lt;") : match[0].indexOf("(");

            // if there are no < or (, therefore get {
            if(!hasAngleBracket && endIndex === -1) {
                endIndex = match[0].indexOf("{");
            }

            // Extract the substring to replace
            let substringToReplace = match[0].substring(startIndex + stdKeywordLength, endIndex);

            // Handle dot notation (e.g., namespace.Constructor)
            if (substringToReplace.includes(".")) {
                const lastDotIndex = substringToReplace.lastIndexOf(".");
                const subSubStrToReplace = substringToReplace.substring(lastDotIndex + 1);
                const newSubSubStrToReplace = `<cnstrInvc>${subSubStrToReplace}</cnstrInvc>`;
                const newSubstringToReplace = substringToReplace.replace(subSubStrToReplace, newSubSubStrToReplace);

                // Replace in the original match
                const newMatch = match[0].replace(substringToReplace, newSubstringToReplace);
                theCode = theCode.replaceAll(match[0], newMatch);
            }
            // Handle direct constructor calls
            else {
                const newSubstringToReplace = substringToReplace.replaceAll(
                    capitalCharRegex,
                    item => `<cnstrInvc>${item}</cnstrInvc>`
                );
                const newMatch = match[0].replace(substringToReplace, newSubstringToReplace);
                theCode = theCode.replaceAll(match[0], newMatch);
            }
        });

        return theCode;
    }


    function detectPropertyDeclarations(theCode) {

        const propShortRegex = /\b[A-Z][a-zA-Z0-9]*\s*=&gt;/g
        const propTradRegex = /\b[A-Z][a-zA-Z0-9]*\s*\{\s*<stdKeyword>(?:.*?)get/g
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matchesProperties = [];

        let matchProperty;
        while ((matchProperty = propShortRegex.exec(theCode)) !== null) {
            matchesProperties.push(matchProperty);
        }
        while ((matchProperty = propTradRegex.exec(theCode)) !== null) {
            matchesProperties.push(matchProperty);
        }

        matchesProperties.forEach(property => {

            let newMatch = property[0].replace(capitalCharRegex, (item) => `<propertyDeclr>${item}</propertyDeclr>`);

            theCode = theCode.replaceAll(property[0], newMatch);

        });

        return theCode;
    }

    function detectVariableNewAssignmentsNonGeneric(theCode) {

        const varAssignmentNonGenericRegex = /\b[A-Z][a-zA-Z0-9]*\s+[a-z][a-zA-Z0-9]*\s*=\s*/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matchesNonGeneric = [];

        let match;
        while ((match = varAssignmentNonGenericRegex.exec(theCode)) !== null) {
            matchesNonGeneric.push(match);
        }

        matchesNonGeneric = matchesNonGeneric
            .filter(item => item[0].includes("="));

        matchesNonGeneric.forEach(item => {

            let newMatch = item[0].replace(capitalCharRegex, (item) => `<varNewAssignmentNG>${item}</varNewAssignmentNG>`);

            theCode = theCode.replaceAll(item[0], newMatch);

        });

        return theCode;
    }

    function detectNonGenericMethods(theCode) {
        // Simpler Regex: Find Capitalized word possibly followed by '(' - context checked later
        // We capture the word itself (Group 1)
        const potentialNameRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
        const classNameRegex = /<classDecl>.*?>(.*?)<\/span><\/classDecl>/g;

        // --- 1. Extract Class Names ---
        let classNames = new Set();
        let classNameMatch;
        const tempCodeForClassNames = theCode; // Use original code
        while ((classNameMatch = classNameRegex.exec(tempCodeForClassNames)) !== null) {
            const nameMatch = classNameMatch[0].match(/<classDecl>.*?>(.*?)<\/span><\/classDecl>/);
            if (nameMatch && nameMatch[1]) {
                const plainName = nameMatch[1].replace(/<[^>]*>/g, ''); // Strip potential inner tags
                classNames.add(plainName);
            }
        }

        // --- 2. Find ALL Capitalized Names and Validate Context ---
        let validNameLocations = [];
        let nameMatch;

        while ((nameMatch = potentialNameRegex.exec(theCode)) !== null) {
            const name = nameMatch[1];
            const nameStartIndex = nameMatch.index;
            const nameEndIndex = nameStartIndex + name.length;

            // --- 2a. Check if inside <ignore> ---
            const nameMatchInfo = { index: nameStartIndex, text: name };
            if (isInsideIgnoreTags(nameMatchInfo, theCode)) {
                continue;
            }

            // --- 2b. Programmatic Context Check (in ORIGINAL theCode) ---
            let precedingChar = '';
            let effectivePrecedingIndex = nameStartIndex - 1;
            // Look backwards, skipping whitespace and potentially simple tags (like </span>) - This is tricky!
            // Let's keep it simpler for now: check immediate vicinity.
            while (effectivePrecedingIndex >= 0 && /\s/.test(theCode[effectivePrecedingIndex])) {
                effectivePrecedingIndex--;
            }
            if (effectivePrecedingIndex >= 0) {
                precedingChar = theCode[effectivePrecedingIndex];
                // If preceded by > might be end of a tag, look further back? For now, just get the char.
                if (precedingChar === '>') {
                    // Very basic attempt to peek before a potential closing tag
                    let tempIndex = theCode.lastIndexOf('<', effectivePrecedingIndex -1);
                    if (tempIndex > 0) { // found a tag start before it
                        let prevCharIndex = tempIndex - 1;
                        while (prevCharIndex >= 0 && /\s/.test(theCode[prevCharIndex])) {
                            prevCharIndex--;
                        }
                        if (prevCharIndex >=0) precedingChar = theCode[prevCharIndex];
                        else precedingChar = ''; // start of string essentially
                    }
                }
            }


            let followingChar = '';
            let effectiveFollowingIndex = nameEndIndex;
            // Look forwards, skipping whitespace
            while (effectiveFollowingIndex < theCode.length && /\s/.test(theCode[effectiveFollowingIndex])) {
                effectiveFollowingIndex++;
            }
            if (effectiveFollowingIndex < theCode.length) {
                followingChar = theCode[effectiveFollowingIndex];
            }

            // --- 2c. Determine Match Type based on context ---
            let matchType = null;
            if (followingChar === '(') {
                if (precedingChar === '.') {
                    matchType = 'dotMethod';
                } else if (/\s/.test(theCode[nameStartIndex - 1]) || nameStartIndex === 0) { // preceded by whitespace or start of string
                    // Check if it's a class name (constructor) or method
                    if (classNames.has(name)) {
                        matchType = 'potentialConstructorOrMethod'; // Treat as constructor for now
                    } else {
                        matchType = 'potentialConstructorOrMethod'; // Treat as method if not class name
                    }
                }
            }

            // --- 2d. Store if valid context found ---
            if (matchType) {
                validNameLocations.push({
                    name: name,
                    nameStartIndex: nameStartIndex,
                    nameEndIndex: nameEndIndex,
                    type: matchType // Store 'dotMethod' or 'potentialConstructorOrMethod'
                });
            }
        }

        // --- 3. Sort Valid Locations in Reverse Order ---
        validNameLocations.sort((a, b) => b.nameStartIndex - a.nameStartIndex);

        // --- 4. Process Locations from End to Beginning ---
        let modifiedCode = theCode; // Work on a copy

        for (const loc of validNameLocations) {

            // --- 4b. Determine Tag Type (constrNG or methodNG) ---
            let tagType = 'methodNG'; // Default
            // Re-check against classNames specifically for non-dot matches
            if (loc.type === 'potentialConstructorOrMethod' && classNames.has(loc.name)) {
                tagType = 'constrNG';
            }
            // 'dotMethod' type always results in 'methodNG' tag

            // --- 4c. Sanity Check and Precise Replacement ---
            try {
                // *** CRITICAL SANITY CHECK ***
                // Does the text in the *current* modifiedCode at the calculated position *still* match the expected name?
                const currentSegment = modifiedCode.substring(loc.nameStartIndex, loc.nameEndIndex);

                if (currentSegment !== loc.name) {
                    // If it doesn't match, it means a previous replacement shifted indices or modified this area.
                    // Skip this replacement to avoid corruption.
                    console.warn(`Skipping replacement for "${loc.name}" at original index ${loc.nameStartIndex}. Content mismatch in modified code: expected "${loc.name}", found "${currentSegment}".`);
                    continue;
                }

                // If the sanity check passes, perform the replacement
                const replacementTag = `<${tagType}>${loc.name}</${tagType}>`;
                modifiedCode =
                    modifiedCode.substring(0, loc.nameStartIndex) +  // Part before the name
                    replacementTag +                               // Wrapped name
                    modifiedCode.substring(loc.nameEndIndex);       // Part after the name

            } catch (e) {
                // Log errors during the substring/concatenation process
                console.error(`Error during replacement for "${loc.name}" at original index ${loc.nameStartIndex}:`, e);
            }
        }

        // --- 5. Return Modified Code ---
        return modifiedCode;
    }

    function isInsideIgnoreTags(match, fullText) {
        // 1. Input Validation: Check if 'match' is valid and has 'index'
        if (!match || match.index === undefined) return false;

        // --- Missing Check: Ensure match.text exists and is a string ---
        // If match.text is null/undefined/not a string, match.text.length will fail.
        if (typeof match.text !== 'string') {
            // console.warn("isInsideIgnoreTags received match without valid 'text':", match); // Optional: for debugging
            return false; // Cannot determine length or end index
        }
        // --------- End of Added Check ---------

        const matchStart = match.index;
        const matchEnd = matchStart + match.text.length; // Position *after* the last char

        const ignoreRegex = /<ignore>([\s\S]*?)<\/ignore>/g;
        let ignoreMatch;

        // Reset lastIndex in case this regex is used elsewhere or called multiple times
        ignoreRegex.lastIndex = 0;

        while ((ignoreMatch = ignoreRegex.exec(fullText)) !== null) {
            const ignoreBlockStartIndex = ignoreMatch.index;
            const ignoreTagStartLength = '<ignore>'.length;
            const ignoreTagEndLength = '</ignore>'.length;

            // --- Added Robustness: Check for minimal tag length ---
            // Prevents errors if a partial/malformed tag like "<ignore>" is somehow matched alone
            if (ignoreMatch[0].length < ignoreTagStartLength + ignoreTagEndLength) {
                continue; // Skip this potentially invalid ignore block match
            }
            // --------- End of Added Check ---------

            const contentStart = ignoreBlockStartIndex + ignoreTagStartLength;
            // Calculate end index based on the full match length
            const contentEnd = ignoreBlockStartIndex + ignoreMatch[0].length - ignoreTagEndLength; // Position *after* the last char of content

            // --- Core Logic Check ---
            // Does the match start at or after the content starts?
            // Does the match end at or before the content ends?
            // This ensures the entire match is *within* the ignore content boundaries.
            if (matchStart >= contentStart && matchEnd <= contentEnd) {
                return true; // Match is fully contained within this ignore block
            }
        }

        // If the loop completes without finding containment
        return false;
    }

    function detectStaticClassNames(theCode) {
        const staticClassNameRegex = /\b[A-Z][a-zA-Z0-9_]*\s*\n*\s*\./g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;
        const moreThan1DotRegex = /\b\w+(\s*\.\s*\w+){1,}\s*\./g;

        let theCodeTillNamespace = theCode.substring(0, theCode.indexOf("namespace"));
        let theCodeToModify = theCode.substring(theCode.indexOf("namespace"), theCode.length);

        // Process matches from end to beginning
        let matchesMoreThan1Dot = [];
        let matchMoreThan1Dot;
        while ((matchMoreThan1Dot = moreThan1DotRegex.exec(theCodeToModify)) !== null) {
            matchesMoreThan1Dot.push({
                text: matchMoreThan1Dot[0],
                startIndex: matchMoreThan1Dot.index,
                endIndex: matchMoreThan1Dot.index + matchMoreThan1Dot[0].length
            });
        }

        // Process matches from end to beginning
        let matches = [];
        let match;
        while ((match = staticClassNameRegex.exec(theCodeToModify)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });
        }

        // Remove matches from `matches` if their index equals any match in `matchesMoreThan1Dot`
        for (let i = matches.length - 1; i >= 0; i--) {
            const matchItem = matches[i];
            // Check if index exists in matchesMoreThan1Dot
            const matchExists = matchesMoreThan1Dot.some(m => matchItem.index >= m.startIndex && matchItem.index <= m.endIndex);

            if (matchExists) {
                // Remove the match from matches
                matches.splice(i, 1);
            }
        }

        // Sort matches in reverse order (end to beginning)
        matches.sort((a, b) => b.index - a.index);

        // Create a working copy
        let modifiedCode = theCodeToModify;

        // Process each match from end to beginning
        for (const match of matches) {
            if (!isInsideIgnoreTags(match, theCodeToModify)) {
                const newText = match.text.replace(capitalCharRegex, (item) => `<staticCN>${item}</staticCN>`);

                // Replace at exact position
                modifiedCode =
                    modifiedCode.substring(0, match.index) +
                    newText +
                    modifiedCode.substring(match.index + match.text.length);
            }
        }

        return theCodeTillNamespace + modifiedCode;
    }

    function detectGenericMethodsInvocation(theCode) {

        const typeCapitalLetterPlusGeneric = /\.(\w+)(?:\s+)?&lt;/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matchesGeneric = [];

        let match;
        while ((match = typeCapitalLetterPlusGeneric.exec(theCode)) !== null) {
            matchesGeneric.push(match);
        }

        matchesGeneric.forEach(item => {

            let newMatch = item[0].replace(capitalCharRegex, (item) => `<methodGInvc>${item}</methodGInvc>`);

            theCode = theCode.replaceAll(item[0], newMatch);

        });

        return theCode;
    }

    function detectSimpleTuples(theCode) {

        const tuplesRegex = /\(\s*([A-Z][a-zA-Z]*\s*,\s*)+[A-Z][a-zA-Z]*\s*\)/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matchesGeneric = [];

        let match;
        while ((match = tuplesRegex.exec(theCode)) !== null) {
            matchesGeneric.push(match);
        }

        matchesGeneric.forEach(item => {

            let newMatch = item[0].replace(capitalCharRegex, (item) => `<tuple>${item}</tuple>`);

            theCode = theCode.replaceAll(item[0], newMatch);

        });

        return theCode;
    }

    function detectGenericVarDeclarations(theCode) {

        const classWithGenericParams =/(?:^|\s)([A-Z][a-zA-Z0-9_]*)\s*(?=&lt;)/g
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        const methodWithGenericParams = /(\S+)(?:\s+)([A-Z][a-zA-Z0-9_]*\s*&lt;)/g;

        let matchesClassGeneric = [];

        let matchClass;
        while ((matchClass = classWithGenericParams.exec(theCode)) !== null) {
            matchesClassGeneric.push(matchClass);
        }

        let matchesMethodGeneric = [];

        let matchMethod;
        while ((matchMethod = methodWithGenericParams.exec(theCode)) !== null) {
            matchesMethodGeneric.push(matchMethod);
        }

        matchesMethodGeneric = matchesMethodGeneric
            .filter(item => !item[0].includes("span") && !item[0].includes("}") && !item[0].includes(","));

        matchesClassGeneric = matchesClassGeneric.filter(item => {
            return !matchesMethodGeneric.some(item2 => item2[2].replaceAll("&lt;", "").trim() === item[0].trim());
        });

        matchesClassGeneric.forEach(item => {

            if (!isInsideIgnoreTags(item, theCode)) {

                let newMatch = item[0].replace(capitalCharRegex, (item) => `<varGDecl>${item}</varGDecl>`);

                theCode = theCode.replaceAll(item[0], newMatch);

            }
        });

        return theCode;
    }

    function detectGenericMethods(theCode) {

        const methodWithGenericParams = /[ \t\r\n]*([A-Z][A-Za-z0-9]*)[ \t\r\n]*&lt;[\s\S]*?&gt;[ \t\r\n]*\(/g

        let matchesMethodGeneric = [];

        let matchMethod;
        while ((matchMethod = methodWithGenericParams.exec(theCode)) !== null) {
            matchesMethodGeneric.push(matchMethod);
        }

        matchesMethodGeneric.forEach(item => {

            if (!isInsideIgnoreTags(item, theCode)) {

                let newMatch = item[0].replace(item[1], (item) => `<methodGDecl>${item}</methodGDecl>`);

                theCode = theCode.replaceAll(item[0], newMatch);
            }
        });

        return theCode;
    }

    function detectFieldsDeclaration(theCode) {
        // Updated regex to catch compound class names
        const fieldsRegExp = /([A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*)\s+([a-z_][a-zA-Z0-9_]*)\b/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matches = [];
        let match;

        while ((match = fieldsRegExp.exec(theCode)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });
        }

        matches = matches.filter(item => !isInsideIgnoreTags(item, theCode));

        // Sort matches by index in descending order to replace from end to start
        // This prevents offset issues when replacing
        matches.sort((a, b) => b.index - a.index);

        for (const item of matches) {
            let newMatch = item.text.replace(capitalCharRegex, (match) => {
                if (match.length === 1 && match >= 'A' && match <= 'Z') {
                    return `<typeParam>${match}</typeParam>`;
                } else {
                    return `<varInstance>${match}</varInstance>`;
                }
            });

            // Use splice to replace at exact position instead of replaceAll
            theCode = theCode.substring(0, item.index) +
                newMatch +
                theCode.substring(item.index + item.text.length);
        }

        return theCode;
    }

    function detectReturnValueMethodNG(theCode) {

        const returnValueMethodNGRegex = /\b(\w+)\s+<methodNG>/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matches = [];

        let match;
        while ((match = returnValueMethodNGRegex.exec(theCode)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });
        }

        matches = matches.filter(item => !isInsideIgnoreTags(item, theCode));

        matches.sort((a, b) => b.index - a.index);

        for (const item of matches) {
            let newMatch = item.text.replace(capitalCharRegex, (match) => {
                    return `<returnValueMethodNG>${match}</returnValueMethodNG>`;
            });

            // Use splice to replace at exact position instead of replaceAll
            theCode = theCode.substring(0, item.index) +
                newMatch +
                theCode.substring(item.index + item.text.length);
        }

        return theCode;
    }

    function detectReturnValueMethodG(theCode) {

        const returnValueMethodNGRegex = /\b(\w+)\s+<methodGDecl>/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matches = [];

        let match;
        while ((match = returnValueMethodNGRegex.exec(theCode)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });
        }

        matches = matches.filter(item => !isInsideIgnoreTags(item, theCode));

        matches.sort((a, b) => b.index - a.index);

        for (const item of matches) {
            let newMatch = item.text.replace(capitalCharRegex, (match) => {
                return `<returnValueMethodG>${match}</returnValueMethodG>`;
            });

            // Use splice to replace at exact position instead of replaceAll
            theCode = theCode.substring(0, item.index) +
                newMatch +
                theCode.substring(item.index + item.text.length);
        }

        return theCode;
    }

    function detectGenericBrackets(theCode) {

        const genericBrackets = /&lt;[^]*?&gt;/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matches = [];

        let match;
        while ((match = genericBrackets.exec(theCode)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });
        }

        matches = matches
            .filter(item => !item.text.includes("stdKeyword"))
            .filter(item => !item.text.includes("span"))
            .filter(item => !item.text.includes("="))
            .filter(item => !item.text.includes("/"))
            .filter(item => !item.text.includes("summary"));

        matches = matches.filter(item => !isInsideIgnoreTags(item, theCode));

        matches.sort((a, b) => b.index - a.index);

        for (const item of matches) {
            let newMatch = item.text.replace(capitalCharRegex, (match) => {
                return `<gTypeName>${match}</gTypeName>`;
            });

            // Use splice to replace at exact position instead of replaceAll
            theCode = theCode.substring(0, item.index) +
                newMatch +
                theCode.substring(item.index + item.text.length);
        }

        return theCode;
    }

    function detectPropertyType(theCode) {

        const returnValueMethodNGRegex = /\b(\w+)\s+<propertyDeclr>/g;
        const capitalCharRegex = /\b[A-Z][a-zA-Z0-9_]*\b/g;

        let matches = [];

        let match;
        while ((match = returnValueMethodNGRegex.exec(theCode)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });
        }

        matches = matches.filter(item => !isInsideIgnoreTags(item, theCode));

        matches.sort((a, b) => b.index - a.index);

        for (const item of matches) {
            let newMatch = item.text.replace(capitalCharRegex, (match) => {
                return `<propTypeName>${match}</propTypeName>`;
            });

            // Use splice to replace at exact position instead of replaceAll
            theCode = theCode.substring(0, item.index) +
                newMatch +
                theCode.substring(item.index + item.text.length);
        }

        return theCode;
    }

    function colorize(theCode) {

        let divPreStart = '<div style=\"background: #ffffff; overflow:auto;width:auto;padding:.2em .6em;\"><pre style=\"margin: 0; line-height: 125%\">';
        let divPreEnd = '</pre></div>';

        theCode = specialCharsShielding(theCode);

        theCode = detectCommentsAndStrings(theCode);
        // to do : enum for colors
        theCode = addColorSpanTags(theCode, "oneLineComment", "<span style=\"color: #008000\">");
        theCode = addColorSpanTags(theCode, "docComment", "<span style=\"color: #90b493\">");
        theCode = addColorSpanTags(theCode, "str", "<span style=\"color: #d6092d\">");
        theCode = addColorSpanTags(theCode, "multiLineComment", "<span style=\"color: #008000\">");
        theCode = addColorSpanTags(theCode, "strDollar", "<span style=\"color: #913831\">");
        theCode = addColorSpanTags(theCode, "strAt", "<span style=\"color: #913831\">");

        theCode = detectSeparateChars(theCode);
        theCode = addColorSpanTags(theCode, "chr", "<span style=\"color: #ff3131\">");

        theCode = detectStdKeywords(theCode);
        theCode = addColorSpanTags(theCode, "stdKeyword", "<span style=\"color: #0000ff\">");
        theCode = addColorSpanTags(theCode, "stdSpecKeyword", "<span style=\"color: #c204b2\">");

        theCode = detectStaticUsingDeclarations(theCode);
        theCode = addColorSpanTags(theCode, "usngDecl", "<span style=\"color: #0b856c\">");

        theCode = detectTypeDeclarations(theCode, "class");
        theCode = addColorSpanTags(theCode, "classDecl", "<span style=\"color: #419db8\">");

        theCode = detectTypeDeclarations(theCode, "struct");
        theCode = addColorSpanTags(theCode, "structDecl", "<span style=\"color: #419db8\">");

        theCode = detectTypeDeclarations(theCode, "interface");
        theCode = addColorSpanTags(theCode, "interfaceDecl", "<span style=\"color: #419db8\">");

        theCode = detectTypeDeclarations(theCode, "enum");
        theCode = addColorSpanTags(theCode, "enumDecl", "<span style=\"color: #419db8\">");

        theCode = detectRecordTypeDeclarations(theCode); // record doesn't work
        theCode = addColorSpanTags(theCode, "recordDecl", "<span style=\"color: #419db8\">");

        theCode = detectAttributes(theCode);
        theCode = addColorSpanTags(theCode, "attr", "<span style=\"color: #2d8ca8\">");

        theCode = detectPropertyDeclarations(theCode);

        theCode = detectConstructorInvocations(theCode);
        theCode = addColorSpanTags(theCode, "cnstrInvc", "<span style=\"color: #419db8\">");

        theCode = detectVariableNewAssignmentsNonGeneric(theCode);
        theCode = addColorSpanTags(theCode, "varNewAssignmentNG", "<span style=\"color: #419db8\">");

        theCode = detectNonGenericMethods(theCode);
        theCode = addColorSpanTags(theCode, "constrNG", "<span style=\"color: #419db8\">");
        theCode = addColorSpanTags(theCode, "methodNG", "<span style=\"color: #964b00\">");

        theCode = detectStaticClassNames(theCode);
        theCode = addColorSpanTags(theCode, "staticCN", "<span style=\"color: #419db8\">");

        theCode = detectGenericMethodsInvocation(theCode);
        theCode = addColorSpanTags(theCode, "methodGInvc", "<span style=\"color: #964b00\">");

        theCode = detectSimpleTuples(theCode);
        theCode = addColorSpanTags(theCode, "tuple", "<span style=\"color: #5ab6d1\">");

        theCode = detectGenericVarDeclarations(theCode);
        theCode = addColorSpanTags(theCode, "varGDecl", "<span style=\"color: #419db8\">");

        theCode = detectFieldsDeclaration(theCode);
        theCode = addColorSpanTags(theCode, "varInstance", "<span style=\"color: #419db8\">");
        theCode = addColorSpanTags(theCode, "typeParam", "<span style=\"color: #bbe4f0\">");

        theCode = detectGenericMethods(theCode);
        theCode = addColorSpanTags(theCode, "methodGDecl", "<span style=\"color: #964b00\">");

        theCode = detectReturnValueMethodNG(theCode);
        theCode = addColorSpanTags(theCode, "returnValueMethodNG", "<span style=\"color: #419db8\">");

        theCode = detectReturnValueMethodG(theCode);
        theCode = addColorSpanTags(theCode, "returnValueMethodG", "<span style=\"color: #419db8\">");

        theCode = detectGenericBrackets(theCode);
        theCode = addColorSpanTags(theCode, "gTypeName", "<span style=\"color: #419db8\">");

        theCode = detectPropertyType(theCode);
        theCode = addColorSpanTags(theCode, "propTypeName", "<span style=\"color: #419db8\">");

        return `${divPreStart}${theCode}${divPreEnd}`;
    }

    function convert() {

        let csharpSourceCodeTextarea = document.getElementById('csharp_source_code');
        let convertedCodeTextarea = document.getElementById('csharp_source_code_converted_into_html');
        let previewOutputDiv = document.getElementById('previewOutput');
        let resultPreview = document.getElementById('finalResultPreview');

        let codeToWorkWith = csharpSourceCodeTextarea.value;

        if (codeToWorkWith === "") {

            convertedCodeTextarea.value = "";

            previewOutputDiv.style.display = 'none';

            return;
        }

        let colorizedCode = colorize(codeToWorkWith);

        convertedCodeTextarea.value = colorizedCode;

        resultPreview.innerHTML = colorizedCode;

        previewOutputDiv.style.display = 'block';

    }