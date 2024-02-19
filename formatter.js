    const csharpStateSetOfKeywords = 
    
    [ "async ", "await ", " in ", " as ", "abstract ", "base", "bool ", "break", "byte", "case", "readonly",
      "catch", "char ", "checked", "class", "const", "continue", "fixed", 
      "decimal", "default", "delegate", " do ", "double", "sizeof",
      "enum", "explicit", "extern", "event", "false", "finally", "stackalloc",
      "float", "goto", "implicit", "static ", "partial", " int ",
      "int ", "interface", "internal", " is ", "lock", "long", "unit", "get", "set",
      "namespace", "new ", "int[", "null", "object", "operator", "out", "ulong",
      "override", "params", "private", "protected", "public", "unchecked",
      "ref", "sbyte", "sealed", "short", "string", "virtual", " where ",
      "struct", "switch", "this", "with", "true", "try", "void", "var ",
      "unsafe", "ushort", "using", "typeof", "volatile", "<char", "new(", "int."
    ];

    const csharpBehaviorSetOfKeywords = ["return", "if", "while", "foreach", "for ", "throw", "else"];

    const specialChars = { 
        "<" : "&lt;", 
        ">" : "&gt;"
    };

    aSingleSpanOpeningTagRegExp = /<span\s+style="color:\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})"\s*>/g;
    aSingleSpanClosingTag = "</span>";
        
    function getClassHeaders(theCode) {
                
        let classHeaders = [];
        
        let separator = "class</span>";
        let chunks = theCode.split(new RegExp(`(${separator})`));
        
        chunks.forEach(chunk => {
            
            if(chunk.startsWith("</class>")) {
                
                let insideComment = false;
                
                for (let i = 0; i < chunk.length; i++) {
                    
                    if (chunk.substring(i, i + 9) === "<comment>") {
                        
                        insideComment = true;
                    
                    } else if (chunk.substring(i, i + 10) === "</comment>") {
                        
                        insideComment = false;
                    
                    } else if (chunk[i] === "{" && !insideComment) {
                        
                        classHeaders.push(chunk.substring(0, i + 1));
                        
                        break;
                    
                    } else if (chunk.includes("<class>") && chunk.includes(" where") && chunk.includes(":") && !insideComment) {
                        
                        classHeaders.push(chunk.substring(0, chunk.indexOf("<span")));
                        
                        break;
                    }
                }
            }
        });

        return classHeaders;
    }

    function getClassName(classHeader) {

        let startPos = classHeader.indexOf("</class>") + "</class>".length;

        let grab = true;
        let insideComment = false;
        let insideSpan = false;

        let accumulator = "";

        let commentOpenLength = "<comment>".length;
        let commentCloseLength = "</comment>".length;
        let spanOpenLength = "<span".length;
        let spanCloseLength = "</span>".length;

        for (let i = startPos; i < classHeader.length; i++) {
            
            if (classHeader.substring(i, i + commentOpenLength) === "<comment>" && classHeader.substring(i - commentCloseLength, i) !== "</comment>") {
                
                grab = false;
                insideComment = true;
            }

            if (classHeader.substring(i - commentCloseLength, i) === "</comment>" && classHeader.substring(i, i + commentOpenLength) !== "<comment>") {

                grab = true;
                insideComment = false;
            }

            if (classHeader.substring(i, i + commentOpenLength) === "<comment>" && classHeader.substring(i - commentCloseLength, i) === "</comment>") {

                grab = false;
                insideComment = true;
            }

            if (classHeader.substring(i, i + spanOpenLength) === "<span") {

                grab = false;
                insideSpan = true;
            }

            if (classHeader.substring(i - spanCloseLength, i) === "</span>") {
                
                grab = true;
                insideSpan = false;
            }

            if(grab && !insideComment && !insideSpan) {

                accumulator += classHeader[i];

            }
        }

        if(!accumulator.includes(":")) {

            return accumulator.replaceAll("{", "").replaceAll("/n", "").trim();

        } 
        else if (accumulator === "")
        {
            return "";
        } 
        else if (accumulator.includes(":")) {
            
            let resultArray = accumulator.split(/,|:/).map(_ => _.replaceAll("{", "").replaceAll("/n", "").trim());

            return resultArray;
        }
    }

    function isInside(openTag, closeTag, str, index) {

        let substringLeft = str.substring(0, index);

        let openTagLength = openTag.length;
        let closeTagLength = closeTag.length;
        
        for (let i = index; i > 0; i--) {
            if(substringLeft.substring(i - openTagLength, i) == openTag) {
                return true;
            }
            if(substringLeft.substring(i - closeTagLength, i) == closeTag) {
                break;
            }
        }

        return false;
    }

    function replaceTheTypeName(theCode, strPattern) {

        let search = strPattern;
        let index = theCode.indexOf(search);

        let replacement = "";
        
        if(search.includes("&lt;") && search.includes("&gt;")) {
            let beginGeneric = search.indexOf("&lt;");
            let endGeneric = search.indexOf("&gt;");
            let typeNameBeforeGenericParam = search.substring(0, beginGeneric);
            let genericParams = search.substring(beginGeneric + "&lt;".length, endGeneric);
            replacement = `<typeObject><span style="color: #058BB9">${typeNameBeforeGenericParam}</span></typeObject>` + 
            `&lt;<typeObject><span style="color: #058594">${genericParams}</span></typeObject>&gt`;                            
        }
        else if(search.startsWith(" ") && search.endsWith("<comment>")) {
            replacement = `<typeObject><span style="color: #058BB9">${search.replace("<comment>", "")}</span></typeObject><comment>`;
        }
        else if(search.startsWith("</comment>") && search.endsWith("{")) {
            replacement = `</comment><typeObject><span style="color: #058BB9">${search.replace("</comment>", "").replace("{", "")}</span></typeObject>{`;
        }
        else if(search.startsWith(" ") && search.endsWith("<span style=\"color: #0000FF\"> where")) {
            replacement = `<typeObject><span style="color: #058BB9">${search.replace("<span style=\"color: #0000FF\"> where", "")}</span></typeObject><span style="color: #0000FF"> where`;
        }
        else if(search.startsWith(" ") && search.endsWith("(")) {
            replacement = `<typeObject><span style="color: #058BB9">${search.replace("(", "")}</span></typeObject>(`;
        }
        else if(search.startsWith("</span>") && search.endsWith("(")) {
            replacement = `</span><typeObject><span style="color: #058BB9">${search.replace("</span>", "").replace("(", "")}</span></typeObject>(`;
        }
        else {
            replacement = `<typeObject><span style="color: #058BB9">${search}</span></typeObject>`;
        }

        while (index !== -1) {
            
            if(!this.isInside("<comment>", "</comment>", theCode, index) && !this.isInside("<strValue>", "</strValue>", theCode, index)) {
                   
                theCode = theCode.substring(0, index) + replacement + theCode.substring(index + search.length);
                
            }
                
            index = theCode.indexOf(search, index + replacement.length);
        }

        return theCode;
    }

    function highlightCustomTypes(theCode) {

        let headers = this.getClassHeaders(theCode);
        let types = [];

        headers.forEach(header => { 
            
            let theClassName = this.getClassName(header);

            if(theClassName !== '' && theClassName !== "\n") {
                types.push(theClassName); 
            }

        });

        types = [...new Set(types)];

        for (let i = 0; i < types.length; i++) {
            
            if(Array.isArray(types[i])) {

                for (let j = 0; j < types[i].length; j++) {

                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + "\n");
                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + ",");
                    theCode = this.replaceTheTypeName(theCode, ":" + types[i][j] + ",");
                    theCode = this.replaceTheTypeName(theCode, ": " + types[i][j] + ",");
                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + " ");
                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + "(");
                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + "{");
                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + "<comment>");
                    theCode = this.replaceTheTypeName(theCode, "</comment>" + types[i][j] + "{");
                    theCode = this.replaceTheTypeName(theCode, " " + types[i][j] + "<span style=\"color: #0000FF\"> where");
                    theCode = this.replaceTheTypeName(theCode, "</span>" + types[i][j] + "(");
                }

            }
            else {
                
                theCode = this.replaceTheTypeName(theCode, " " + types[i] + "\n");
                theCode = this.replaceTheTypeName(theCode, " " + types[i] + " ");
                theCode = this.replaceTheTypeName(theCode, " " + types[i] + "{");
                theCode = this.replaceTheTypeName(theCode, " " + types[i] + "(");
                theCode = this.replaceTheTypeName(theCode, " " + types[i] + "<comment>");
                theCode = this.replaceTheTypeName(theCode, "</comment>" + types[i] + "{");
                theCode = this.replaceTheTypeName(theCode, " " + types[i] + "<span style=\"color: #0000FF\"> where");
                theCode = this.replaceTheTypeName(theCode, "</span>" + types[i] + "(");
            }

        }

        return theCode;
    }

    function highlightStdKeywords(theCode) {

        let beginTagsToIgnore = {
            strValue: "<strValue>",
            strValueDollar: "<strValueDollar>",
            comment: "<comment>"
        };

        let endTagsToIgnore = {
            strValue: "</strValue>",
            strValueDollar: "</strValueDollar>",
            comment: "</comment>"
        };

        let allLinesOfTheCode = theCode.split("\n");
        let theUpdatedCode = "";

        for (let currentLineNumber = 0; currentLineNumber < allLinesOfTheCode.length; currentLineNumber++) {
            
            allLinesOfTheCode[currentLineNumber] = allLinesOfTheCode[currentLineNumber] + "\n";

            let currentLine = allLinesOfTheCode[currentLineNumber];
            
            let charAccumulator = "";
            let newLine = "";
            
            let insideTag = false;

            for (let currentChar = 0; currentChar < currentLine.length; currentChar++) {
                
                charAccumulator += currentLine[currentChar];

                Object.values(beginTagsToIgnore).forEach(_ => {

                    if(charAccumulator.includes(_)) { 
                        
                        newLine += charAccumulator;

                        charAccumulator = "";

                        insideTag = true;
                    }

                });

                Object.values(endTagsToIgnore).forEach(_ => {

                    if(charAccumulator.includes(_)) {
                        
                        newLine += charAccumulator;
                        
                        charAccumulator = "";

                        insideTag = false;
                    }

                });

                if(!insideTag) {

                    csharpStateSetOfKeywords.forEach(_ => {

                        if(charAccumulator.includes(_)) {

                            if(_ === "class") {
                                charAccumulator = charAccumulator.replace(_, `<class><span style="color: #0000FF">${_}</span></class>`);    

                                newLine += charAccumulator;
                                charAccumulator = "";
                            }
                            else
                            if(_ === "interface") {
                                charAccumulator = charAccumulator.replace(_, `<interface><span style="color: #0000FF">${_}</span></interface>`);    
                                
                                newLine += charAccumulator;
                                charAccumulator = "";
                            }
                            if(_ === "int[") {
                                
                                charAccumulator = charAccumulator.replace(_, `<span style="color: #0000FF">int</span>[`);    
                                
                                newLine += charAccumulator;
                                charAccumulator = "";
                            }
                            if(_ === "int.") {
                                
                                charAccumulator = charAccumulator.replace(_, `<span style="color: #0000FF">int</span>.`);    
                                
                                newLine += charAccumulator;
                                charAccumulator = "";
                            }
                            if(_ === "new(") {
                                
                                charAccumulator = charAccumulator.replace(_, `<span style="color: #0000FF">new</span>(`);    
                                
                                newLine += charAccumulator;
                                charAccumulator = "";
                            }
                            else {
                                charAccumulator = charAccumulator.replace(_, `<span style="color: #0000FF">${_}</span>`);    

                                newLine += charAccumulator;
                                charAccumulator = "";
                            }
                        }

                    });

                    csharpBehaviorSetOfKeywords.forEach(_ => {

                        if(charAccumulator.includes(_)) {

                            charAccumulator = charAccumulator.replace(_, `<span style="color: #B209D6">${_}</span>`);

                            newLine += charAccumulator;
                            charAccumulator = "";
                        }
                    });

                }
            }

            theUpdatedCode += (newLine + charAccumulator);

            charAccumulator = "";
            newLine = "";
        }

        return theUpdatedCode;
    }

    function highlightComments(theCode) {

        let allLinesOfTheCode = theCode.split("\n");
        let theUpdatedCode = "";

        let isMultilineComment = false;
        let strValueRegExp = new RegExp("<strValue>" + '|' + "</strValue>", 'g');
        
        for (let currentLineNumber = 0; currentLineNumber < allLinesOfTheCode.length; currentLineNumber++) {

            allLinesOfTheCode[currentLineNumber] = allLinesOfTheCode[currentLineNumber] + "\n";

            let theClearedLine = allLinesOfTheCode[currentLineNumber].replaceAll(this.aSingleSpanOpeningTagRegExp,"").replaceAll(this.aSingleSpanClosingTag, "");

            if(isMultilineComment && !theClearedLine.includes("*/")) {

                theClearedLine = this.highlightComment(theClearedLine.substring(0, theClearedLine.length));

                allLinesOfTheCode[currentLineNumber] = theClearedLine;

            }
            else
            if(isMultilineComment && theClearedLine.includes("*/")) {

                let indexOfTheClosingMultiCommentSlash = theClearedLine.indexOf("*/");

                if(theClearedLine.includes("<strValue>")) {
                    
                    let matches = [...theClearedLine.matchAll(strValueRegExp)];
                    
                    let stringsInTheClearedLine = matches.map(match => ({
                        tag: match[0],
                        index: match.index
                    }))
                    .reduce((accumulator, currentValue, index, array) => {
                        if (index % 2 === 0) {
                            accumulator.push([currentValue, array[index + 1]]);
                        }
                        return accumulator;
                    }, []);

                    let theLineWithoutStrings = theClearedLine;

                    stringsInTheClearedLine.forEach(str => {
                        
                        let tagOpenIndex = str[0].index;
                        let tagCloseIndex = str[1].index;

                        let spaces = ' '.repeat(tagCloseIndex + str[1].tag.length - tagOpenIndex);

                        theLineWithoutStrings = theLineWithoutStrings.slice(0, tagOpenIndex) + spaces + theLineWithoutStrings.slice(tagCloseIndex + str[1].tag.length);
                    });

                    indexOfTheClosingMultiCommentSlash = theLineWithoutStrings.indexOf("*/");

                    if(indexOfTheClosingMultiCommentSlash !== -1) {
                        
                        isMultilineComment = false;

                    }

                    theClearedLine = this.highlightComment(theClearedLine.substring(0, indexOfTheClosingMultiCommentSlash)) + theClearedLine.substring(indexOfTheClosingMultiCommentSlash, theClearedLine.length);
                    
                    let theNewLine = "";

                    theNewLine = theClearedLine
                        .replaceAll("<strValue>", "<strValue><span style=\"color: #D6092D\">")
                        .replaceAll("</strValue>", "</span></strValue>")
                        .replaceAll("<strValueDollar>$</strValueDollar>", "<strValueDollar><span style=\"color: #A0040A\">$</span></strValueDollar>");

                    allLinesOfTheCode[currentLineNumber] = theNewLine;
                }

                if(!theClearedLine.includes("<strValue>")) {

                    theClearedLine =  this.highlightComment(theClearedLine.substring(0, indexOfTheClosingMultiCommentSlash + "*/".length)) + theClearedLine.substring(indexOfTheClosingMultiCommentSlash + "*/".length, theClearedLine.length);     
                    
                    allLinesOfTheCode[currentLineNumber] = theClearedLine;

                    isMultilineComment = false;
                }

            }

            if(!isMultilineComment && (theClearedLine.includes("//") || theClearedLine.includes("/*"))) {
                
                let indexOfTheFirstCommentSlashes = theClearedLine.indexOf("//");
                let indexOfTheFirstMultiCommentSlash = theClearedLine.indexOf("/*");

                let closestToTheBeginingOfTheString = Math.min(...[indexOfTheFirstCommentSlashes, indexOfTheFirstMultiCommentSlash].filter(num => num !== -1));

                if(theClearedLine.includes("<strValue>")) {
                    
                    let matches = [...theClearedLine.matchAll(strValueRegExp)];
                    
                    let stringsInTheClearedLine = matches.map(match => ({
                        tag: match[0],
                        index: match.index
                    }))
                    .reduce((accumulator, currentValue, index, array) => {
                        if (index % 2 === 0) {
                            accumulator.push([currentValue, array[index + 1]]);
                        }
                        return accumulator;
                    }, []);

                    let theLineWithoutStrings = theClearedLine;

                    stringsInTheClearedLine.forEach(str => {
                        
                        let tagOpenIndex = str[0].index;
                        let tagCloseIndex = str[1].index;

                        let spaces = ' '.repeat(tagCloseIndex + str[1].tag.length - tagOpenIndex);

                        theLineWithoutStrings = theLineWithoutStrings.slice(0, tagOpenIndex) + spaces + theLineWithoutStrings.slice(tagCloseIndex + str[1].tag.length);
                    });

                    indexOfTheFirstCommentSlashes = theLineWithoutStrings.indexOf("//");
                    indexOfTheFirstMultiCommentSlash = theLineWithoutStrings.indexOf("/*");

                    closestToTheBeginingOfTheString = Math.min(...[indexOfTheFirstCommentSlashes, indexOfTheFirstMultiCommentSlash].filter(num => num !== -1));

                    if((closestToTheBeginingOfTheString === indexOfTheFirstMultiCommentSlash) && (indexOfTheFirstMultiCommentSlash !== -1)) {
                        
                        isMultilineComment = true;

                    }

                    theClearedLine = theClearedLine.substring(0, closestToTheBeginingOfTheString) + this.highlightComment(theClearedLine.substring(closestToTheBeginingOfTheString, theClearedLine.length));
                    
                    let theNewLine = "";

                    theNewLine = theClearedLine
                        .replaceAll("<strValue>", "<strValue><span style=\"color: #D6092D\">")
                        .replaceAll("</strValue>", "</span></strValue>")
                        .replaceAll("<strValueDollar>$</strValueDollar>", "<strValueDollar><span style=\"color: #A0040A\">$</span></strValueDollar>");

                    allLinesOfTheCode[currentLineNumber] = theNewLine;
                }

                if(!theClearedLine.includes("<strValue>")) {

                    theClearedLine = theClearedLine.substring(0, closestToTheBeginingOfTheString) + this.highlightComment(theClearedLine.substring(closestToTheBeginingOfTheString, theClearedLine.length));     

                    if((closestToTheBeginingOfTheString === indexOfTheFirstMultiCommentSlash) && (indexOfTheFirstMultiCommentSlash !== -1)) {
                        
                        isMultilineComment = true;

                    }
                    
                    allLinesOfTheCode[currentLineNumber] = theClearedLine;
                }
            }

            theUpdatedCode += allLinesOfTheCode[currentLineNumber];
        }

        return theUpdatedCode;
    }

    function highlightStrings(theCode) {

        let allLinesOfTheCode = theCode.split("\n");
        let theUpdatedCode = "";
        
        let doubleQuoteRegExp = /"/g;
        let doubleQuotesRegExp = /"([^"]*)"/g;

        for (let currentLineNumber = 0; currentLineNumber < allLinesOfTheCode.length; currentLineNumber++) {

            allLinesOfTheCode[currentLineNumber] = allLinesOfTheCode[currentLineNumber] + "\n";

            let theClearedLine = allLinesOfTheCode[currentLineNumber].replaceAll(this.aSingleSpanOpeningTagRegExp,"").replaceAll(this.aSingleSpanClosingTag, "");

            let numberOfDoubleQuotesInTheLine = (theClearedLine.match(doubleQuoteRegExp) || []).length;

            if (numberOfDoubleQuotesInTheLine > 1) {

                if(!theClearedLine.includes("//") && !theClearedLine.includes("/*") && !theClearedLine.includes("*") && !theClearedLine.includes("*/")) {
                    
                    let strings = theClearedLine.match(doubleQuotesRegExp);

                    if(strings) {
                        strings.forEach(str => {
                            theClearedLine = theClearedLine.replace(str, this.highlightStringValue(str));
                            theClearedLine = theClearedLine.replaceAll("$", this.highlightStringValueDollar());
                        });
                    }

                }

                if(theClearedLine.includes("//") || theClearedLine.includes("/*") || theClearedLine.includes("*")) {

                    let indexOfTheFirstDoubleQuote = theClearedLine.indexOf("\"");

                    let indexOfTheFirstCommentSlashes = theClearedLine.indexOf("//");
                    let indexOfTheFirstMultiCommentSlash = theClearedLine.indexOf("/*");
                    let indexOfTheFirstCommentStar = theClearedLine.indexOf("*");

                    if((indexOfTheFirstDoubleQuote != -1) && (indexOfTheFirstCommentSlashes != -1 || indexOfTheFirstMultiCommentSlash != -1 || indexOfTheFirstCommentStar != -1)) {

                        let closestToTheBeginingOfTheString = Math.min(...[indexOfTheFirstCommentSlashes, indexOfTheFirstMultiCommentSlash, indexOfTheFirstCommentStar].filter(num => num !== -1));

                        if (closestToTheBeginingOfTheString > indexOfTheFirstDoubleQuote) {

                            let splitBySemicolonParts = theClearedLine.split(";");
                            let combindeAfter = "";

                            splitBySemicolonParts.forEach(strUntilSemicolon => {

                                if(!strUntilSemicolon.trimStart().startsWith("//") && !strUntilSemicolon.trimStart().startsWith("/*") && !strUntilSemicolon.trimStart().startsWith("*")) {
                                    
                                    let strings = strUntilSemicolon.match(doubleQuotesRegExp);

                                    if(strings) {
                                        strings.forEach(strValue => {
                                            strUntilSemicolon = strUntilSemicolon.replace(strValue, this.highlightStringValue(strValue));
                                            strUntilSemicolon = strUntilSemicolon.replaceAll("$", this.highlightStringValueDollar());
                                        });
                                    }

                                    if(!(strUntilSemicolon === "\n") && !strUntilSemicolon.endsWith("+\n")) {
                                        strUntilSemicolon += ";";
                                    }
                                }    

                                combindeAfter += strUntilSemicolon;

                            });

                            theClearedLine = combindeAfter;
                        } 
                    }
                }

                allLinesOfTheCode[currentLineNumber] = theClearedLine;
            }

            theUpdatedCode += allLinesOfTheCode[currentLineNumber];
        }

        return theUpdatedCode;
    }

    function highlightNonStaticMethods(theCode) {

        let theUpdatedCode = "";
        let methodsNames = [];

        let openParenthesisIndex = theCode.indexOf("(");

        while (openParenthesisIndex !== -1) {

            if(!this.isInside("<comment>", "</comment>", theCode, openParenthesisIndex) && !this.isInside("<strValue>", "</strValue>", theCode, openParenthesisIndex)) {
                   
                let beforeOpenParenthesis = theCode.substring(0, openParenthesisIndex).trimEnd();

                for (let i = openParenthesisIndex; i > 0; i--) {
                    
                    if(beforeOpenParenthesis[i] === ".") {
                        
                        let methodFullNameRaw = theCode.substring(i, openParenthesisIndex);

                        methodsNames.push({rawName : methodFullNameRaw, startIndex: i, endIndex: openParenthesisIndex});
                        
                        break;                            
                    }
                    else if(beforeOpenParenthesis[i] === " " || beforeOpenParenthesis[i] === "\n" || beforeOpenParenthesis[i] === "(" || beforeOpenParenthesis[i] === ")") {
                        
                        let methodFullNameRaw = theCode.substring(i, openParenthesisIndex);

                        methodsNames.push({rawName : methodFullNameRaw, startIndex: i, endIndex: openParenthesisIndex});
                        
                        break;
                    }
                }
            }
                
            openParenthesisIndex = theCode.indexOf("(", openParenthesisIndex + 1);
        }

        if(methodsNames.length > 0) {
            
            theUpdatedCode += theCode.substring(0, methodsNames[0].startIndex);

            let theUpdatedMethod = "";
            let enclosingSpan = "</span>";
            let enclosingSpanAndType = "</span></typeObject>";
            let strToProcess = "";
            
            for (let i = 0; i < methodsNames.length - 1; i++) {
                
                theUpdatedMethod = theCode.substring(methodsNames[i].startIndex, methodsNames[i].endIndex);

                if(theUpdatedMethod.includes(enclosingSpanAndType)) {
                    strToProcess = theUpdatedMethod.substring(theUpdatedMethod.indexOf(enclosingSpanAndType) + enclosingSpanAndType.length, theUpdatedMethod.length);
                    
                    if(strToProcess.trim() !== "") {
                        strToProcess = `<methodName><span style="color: #7c3f00">${strToProcess}</span></methodName>`;                          
                    }

                    theUpdatedMethod = theUpdatedMethod.substring(0, theUpdatedMethod.indexOf(enclosingSpanAndType) + enclosingSpanAndType.length) + strToProcess;
                }
                else if(theUpdatedMethod.includes(enclosingSpan)) {
                    strToProcess = theUpdatedMethod.substring(theUpdatedMethod.indexOf(enclosingSpan) + enclosingSpan.length, theUpdatedMethod.length);
                    
                    if(strToProcess.trim() !== "") {
                        strToProcess = `<methodName><span style="color: #7c3f00">${strToProcess}</span></methodName>`;
                    }

                    theUpdatedMethod = theUpdatedMethod.substring(0, theUpdatedMethod.indexOf(enclosingSpan) + enclosingSpan.length) + strToProcess;
                }
                else if(theUpdatedMethod.includes("+") || theUpdatedMethod.includes("(") || theUpdatedMethod.includes("[")) {

                }
                else if(theUpdatedMethod.startsWith(".")) {
                    theUpdatedMethod = `.<methodName><span style="color: #7c3f00">${theUpdatedMethod.replace(".", "")}</span></methodName>`;                        
                }
                else {
                    theUpdatedMethod = `<methodName><span style="color: #7c3f00">${theUpdatedMethod}</span></methodName>`;
                }

                theUpdatedCode += theUpdatedMethod;
                theUpdatedCode += theCode.substring(methodsNames[i].endIndex, methodsNames[i + 1].startIndex);
            }

            theUpdatedCode += `<methodName><span style="color: #7c3f00">${theCode.substring(methodsNames[methodsNames.length - 1].startIndex, methodsNames[methodsNames.length - 1].endIndex)}</span></methodName>`;
            theUpdatedCode += theCode.substring(methodsNames[methodsNames.length - 1].endIndex, theCode.length);
        }          

        return theUpdatedCode;
    }

    function highlightStaticMethods(theCode) {
        
        let searchString = "<methodName>";
        let currentIndex = 0;
        let beforeMethods = [];
        
        while (currentIndex !== -1) {

            currentIndex = theCode.indexOf(searchString, currentIndex);
            
            if (currentIndex !== -1) {

                if(!this.isInside("<comment>", "</comment>", theCode, currentIndex) && !this.isInside("<strValue>", "</strValue>", theCode, currentIndex)) {
                    
                    let beforeMethodName = theCode.substring(0, currentIndex);

                    for (let i = currentIndex; i > 0; i--) {
                    
                        if((beforeMethodName[i] === "\n" || 
                           beforeMethodName[i] === "(" || 
                           beforeMethodName[i] === ")" || 
                           beforeMethodName[i] === ";") && 
                           (beforeMethodName.substring(i + 1 , i - 3) !== "&gt;" && 
                           beforeMethodName.substring(i + 1 , i - 3) !== "&lt;")) {
                            
                            beforeMethods.push({rawName : theCode.substring(i, currentIndex), startIndex: i, endIndex: currentIndex});
                            
                            break;                            
                        }
                    }
                }
                
                currentIndex += searchString.length;
            }
        }

        let theUpdatedCode = "";
        let enclosingSpan = "</span>";
        let enclosingSpanAndType = "</span></typeObject>";
        let enclosingSpanAndComment = "</span></comment>";

        if(beforeMethods.length > 0) {

            theUpdatedCode += theCode.substring(0, beforeMethods[0].startIndex);

            let theUpdatedMethod = "";
            let strToProcess = "";

            var wrapWithTags = function(theUpdatedMethod, str) {
                strToProcess = theUpdatedMethod.substring(theUpdatedMethod.lastIndexOf(str) + str.length, theUpdatedMethod.length);
                
                if(strToProcess.trim() !== "") {
                    let separateWords = strToProcess.split(".");
                    separateWords = separateWords.map(_ => {
                        if(_ !== "" && _.trim()[0] !== undefined &&_.trim()[0] == _.trim()[0].toUpperCase()) {
                            _ = `<beforeMethodName><span style="color: #0b856c">${_}</span></beforeMethodName>`;
                        }
                        return _;
                    });
                    strToProcess = separateWords.join(".");
                }

                theUpdatedMethod = theUpdatedMethod.substring(0, theUpdatedMethod.lastIndexOf(str) + str.length) + strToProcess;

                return theUpdatedMethod;
            };
            
            for (let i = 0; i < beforeMethods.length; i++) {
                
                theUpdatedMethod = theCode.substring(beforeMethods[i].startIndex, beforeMethods[i].endIndex);

                if(theUpdatedMethod.includes(enclosingSpanAndType)) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, enclosingSpanAndType);
                }
                else if(theUpdatedMethod.includes(enclosingSpanAndComment)) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, enclosingSpanAndComment);
                }
                else if(theUpdatedMethod.includes(enclosingSpan)) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, enclosingSpan);
                }
                else if(theUpdatedMethod.startsWith("\n")) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, "\n");                                                                        
                }
                else if(theUpdatedMethod.startsWith(";")) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, ";");
                }
                else if(theUpdatedMethod.startsWith(").")) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, ").");
                }
                else if(theUpdatedMethod.includes("=&gt;")) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, "=&gt;");
                }
                else if(theUpdatedMethod.startsWith("(")) {
                    theUpdatedMethod = wrapWithTags(theUpdatedMethod, "(");
                }
                
                theUpdatedCode += theUpdatedMethod;
                

                if(i !== beforeMethods.length - 1) {
                    theUpdatedCode += theCode.substring(beforeMethods[i].endIndex, beforeMethods[i + 1].startIndex);
                }
                else {
                    theUpdatedCode += theCode.substring(beforeMethods[beforeMethods.length - 1].endIndex, theCode.length);
                }
            }
        } 

        return theUpdatedCode === "" ? theCode : theUpdatedCode;
    }

    function highlightStringValue(value) {
        return `<strValue><span style="color: #D6092D">${value}</span></strValue>`;
    }
    
    function highlightStringValueDollar() {
        return `<strValueDollar><span style="color: #A0040A">$</span></strValueDollar>`;
    }

    function highlightComment(value) {
        return `<comment><span style="color: #008000">${value}</span></comment>`;
    }

    function specialCharsShielding(theCode) {

        for (const [sc, htmlsc] of Object.entries(specialChars)) {
            theCode = theCode.replaceAll(sc, htmlsc);
        }

        return theCode;
    }

    function colorize(theCode) {
        
        let divPreStart = '<div style=\"background: #ffffff; overflow:auto;width:auto;padding:.2em .6em;\"><pre style=\"margin: 0; line-height: 125%\">';
        let divPreEnd = '</pre></div>';

        theCode = specialCharsShielding(theCode);
        theCode = highlightStrings(theCode);
        theCode = highlightComments(theCode);
        theCode = highlightStdKeywords(theCode);
        theCode = highlightCustomTypes(theCode);
        theCode = highlightNonStaticMethods(theCode);
        theCode = highlightStaticMethods(theCode);
        
        return `${divPreStart}${theCode}${divPreEnd}`;
    }

    function convert() {
        
        var csharpSourceCodeTextarea = document.getElementById('csharp_source_code');
        var convertedCodeTextarea = document.getElementById('csharp_source_code_converted_into_html');
        var previewOutputDiv = document.getElementById('previewOutput');
        var resultPreview = document.getElementById('finalResultPreview');
        
        var codeToWorkWith = csharpSourceCodeTextarea.value;

        if (codeToWorkWith === "") {
            
            convertedCodeTextarea.value = "";

            previewOutputDiv.style.display = 'none';
            
            return;
        }

        var colorizedCode = colorize(codeToWorkWith);

        convertedCodeTextarea.value = colorizedCode;

        resultPreview.innerHTML = colorizedCode;

        previewOutputDiv.style.display = 'block';
    }