    const csharpStateSetOfKeywords = 
    [ 
        "async", "await", "in", "as", "abstract", "base", "bool", "break", "byte", 
        "catch", "char", "checked", "class", "const", "continue", "fixed", 
        "decimal", "default", "delegate", "do", "double", "sizeof",
        "enum", "explicit", "extern", "event", "false", "finally", "stackalloc",
        "float", "goto", "implicit", "static", "partial", "case", "readonly",
        "interface", "internal", "lock", "long", "unit", "get", "set",
        "namespace", "new", "int", "null", "object", "operator", "out", "ulong",
        "override", "params", "private", "protected", "public", "unchecked",
        "ref", "sbyte", "sealed", "short", "string", "virtual", "where",
        "struct", "switch", "this", "with", "true", "try", "void", "var",
        "unsafe", "ushort", "using", "typeof", "volatile", "is"
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
        " ", "[", "]", "(", ")", "=", ".", "{", "}", ";", "/"
    ];
    
    function specialCharsShielding(theCode) {

        for (const [sc, htmlsc] of Object.entries(specialChars)) {
            theCode = theCode.replaceAll(sc, htmlsc);
        }

        return theCode;
    }

    function detectCommentsAndStrings(theCode) {
        
        let insideTheString = false;
        let insideTheSingleLineComment = false;
        let insideTheMultiLineComment = false;
        let insideTheDocComment = false;
        
        for (index = 0; index < theCode.length - 4; index++) {

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
            if (fourCharsInSequence == "/// " 
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
                
                continue;
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
    };

    function isInsideStringOrComment(theCode, startIndex, endIndex) {
    
        let substringLeft = theCode.substring(0, startIndex);
        let substringRight = theCode.substring(endIndex, theCode.length);

        let strOpen = "<str>";
        let oneLineCommentOpen = "<oneLineComment>";
        let multiLineCommentOpen = "<multiLineComment>";
        let docCommentOpen = "<docComment>";

        let strClose = "</str>";
        let oneLineCommentClose = "</oneLineComment>";
        let multiLineCommentClose = "</multiLineComment>";
        let docCommentClose = "</docComment>";

        let someOpenTagLeft = false;
        let someClosedTagLeft = false;
        let someOpenTagRight = false;
        let someClosedTagRight = false;

        for(let i = substringLeft.length; i > 0; i--) {
            if((substringLeft.substring(i - strOpen.length, i) === strOpen)) {
                someOpenTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - oneLineCommentOpen.length, i) === oneLineCommentOpen)) {
                someOpenTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - multiLineCommentOpen.length, i) === multiLineCommentOpen)) {
                someOpenTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - docCommentOpen.length, i) === docCommentOpen)) {
                someOpenTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - strClose.length, i) === strClose)) {
                someClosedTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - oneLineCommentClose.length, i) === oneLineCommentClose)) {
                someClosedTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - multiLineCommentClose.length, i) === multiLineCommentClose)) {
                someClosedTagLeft = true;
                break;
            }
            if((substringLeft.substring(i - docCommentClose.length, i) === docCommentClose)) {
                someClosedTagLeft = true;
                break;
            }
        }

        for(let i = 0; i < substringRight.length; i++) {
            if((substringRight.substring(i, i + strOpen.length) === strOpen)) {
                someOpenTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + oneLineCommentOpen.length) === oneLineCommentOpen)) {
                someOpenTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + multiLineCommentOpen.length) === multiLineCommentOpen)) {
                someOpenTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + docCommentOpen.length) === docCommentOpen)) {
                someOpenTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + strClose.length) === strClose)) {
                someClosedTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + oneLineCommentClose.length) === oneLineCommentClose)) {
                someClosedTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + multiLineCommentClose.length) === multiLineCommentClose)) {
                someClosedTagRight = true;
                break;
            }
            if((substringRight.substring(i, i + docCommentClose.length) === docCommentClose)) {
                someClosedTagRight = true;
                break;
            }
        }

        if(someOpenTagLeft && someClosedTagRight && !someClosedTagLeft && !someOpenTagRight) {
            return true;
        }
    
        return false;
    }

    function isNotAlphanumeric(char) {
        return /[^a-zA-Z0-9]/.test(char);
    }

    function detectStdKeywords(theCode) {

        let wrap = (keywords, tag) => {

            let ignoreOpenLenght = "<ignore>".length;
            let ignoreCloseLenght = "</ignore>".length;

            let ignore = false;
            
            keywords.forEach(keyword => {

                for(i = 0; i <= theCode.length; i++) {

                    if(theCode.substring(i, i + ignoreOpenLenght) === "<ignore>") {
                        ignore = true;
                    }
                    else 
                    if(theCode.substring(i, i + ignoreCloseLenght) === "</ignore>") {
                        ignore = false;
                    }

                    if(theCode.substring(i, i + keyword.length) === keyword && !ignore) {

                        additionalKeywordChars.forEach(char => {

                            if(theCode.substring(i, i + keyword.length + 1) === keyword + char) {
                                
                                let theCharBeforeTheKeyword = theCode.substring(i - 1, i);

                                if(theCharBeforeTheKeyword !== "" && isNotAlphanumeric(theCharBeforeTheKeyword)) {

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

        let ignoreOpenLenght = "<ignore>".length;
        let ignoreCloseLenght = "</ignore>".length;

        let ignore = false;
        let insideChar = false;

        for(let i = 0; i <= theCode.length; i++) {
            
            if(theCode.substring(i, i + ignoreOpenLenght) === "<ignore>") {
                ignore = true;
            }
            else 
            if(theCode.substring(i, i + ignoreCloseLenght) === "</ignore>") {
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

    function colorize(theCode) {
        
        let divPreStart = '<div style=\"background: #ffffff; overflow:auto;width:auto;padding:.2em .6em;\"><pre style=\"margin: 0; line-height: 125%\">';
        let divPreEnd = '</pre></div>';

        theCode = specialCharsShielding(theCode);
        
        theCode = detectCommentsAndStrings(theCode);
        theCode = addColorSpanTags(theCode, "oneLineComment", "<span style=\"color: #008000\">");
        theCode = addColorSpanTags(theCode, "docComment", "<span style=\"color: #90b493\">");
        theCode = addColorSpanTags(theCode, "str", "<span style=\"color: #D6092D\">");
        theCode = addColorSpanTags(theCode, "multiLineComment", "<span style=\"color: #008000\">");
        theCode = addColorSpanTags(theCode, "strDollar", "<span style=\"color: #913831\">");
        theCode = addColorSpanTags(theCode, "strAt", "<span style=\"color: #913831\">");
        
        theCode = detectStdKeywords(theCode);
        theCode = addColorSpanTags(theCode, "stdKeyword", "<span style=\"color: #0000FF\">");
        theCode = addColorSpanTags(theCode, "stdSpecKeyword", "<span style=\"color: #c204b2\">");

        theCode = detectSeparateChars(theCode);
        theCode = addColorSpanTags(theCode, "chr", "<span style=\"color: #FF3131\">");

        //theCode = highlightCustomTypes(theCode); 
        //theCode = highlightNonStaticMethods(theCode); <methodName><span style="color: #7c3f00"> <span style="color: #0b856c">
        //theCode = highlightStaticMethods(theCode); <span style="color: #0000FF"> <span style="color: #058BB9"> <span style="color: #B209D6">
        
        return `${divPreStart}${theCode}${divPreEnd}`;
    }
    
    /*
    function showLoader() {
        const loadingIndicator = document.getElementById("loadingSpinner");
        loadingIndicator.style.display = "block";
    }

    function hideLoader() {
        const loadingIndicator = document.getElementById("loadingSpinner");
        loadingIndicator.style.display = "none";
    }*/

    function convert() {

        //showLoader();

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

        //hideLoader()

    }