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

    const highlightColors = {
        "singleLineComment" : "<span style=\"color: #0000FF\">"
      };

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

                theCode = theCode.slice(0, index) + "<singleLineComment>" + theCode.slice(index);
            }
            else 
            if (theCode[index] === "\n" && insideTheSingleLineComment) {
                
                insideTheSingleLineComment = false;

                theCode = theCode.slice(0, index) + "</singleLineComment>" + theCode.slice(index);
            }
            else 
            if (fourCharsInSequence == "/// " 
            && !insideTheString 
            && !insideTheSingleLineComment 
            && !insideTheMultiLineComment 
            && !insideTheDocComment) {
                
                insideTheDocComment = true;

                theCode = theCode.slice(0, index) + "<docComment>" + theCode.slice(index);
            }
            else
            if (theCode[index] === "\n" && insideTheDocComment) {
                
                insideTheDocComment = false;

                theCode = theCode.slice(0, index) + "</docComment>" + theCode.slice(index);
            }
            else 
            if(theCode[index] === "\"" && !insideTheString && !insideTheSingleLineComment && !insideTheMultiLineComment && !insideTheDocComment) {
                
                insideTheString = true;

                theCode = theCode.slice(0, index) + "<string>" + theCode.slice(index);
                index += "<string>".length;
            }
            else
            if(theCode[index] === "\"" && theCode[index - 1] === "\\" && insideTheString && !insideTheSingleLineComment && !insideTheMultiLineComment && !insideTheDocComment) {
                
                continue;
            }
            else
            if(theCode[index] === "\"" && insideTheString && !insideTheSingleLineComment && !insideTheMultiLineComment && !insideTheDocComment) {
                
                insideTheString = false;

                theCode = theCode.slice(0, index + 1) + "</string>" + theCode.slice(index + 1); // 1 is length of "
                index += "</string>".length;
            }
            else
            if(twoCharsInSequence === "/*" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && !insideTheMultiLineComment) {
                
                insideTheMultiLineComment = true;

                theCode = theCode.slice(0, index) + "<multiLineComment>" + theCode.slice(index);
            }
            else
            if(twoCharsInSequence === "*/" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && insideTheMultiLineComment) {
                
                insideTheMultiLineComment = false;

                theCode = theCode.slice(0, index + 2) + "</multiLineComment>" + theCode.slice(index + 2); // 2 is length of */
            }
            else
            if(theCode[index] === "$" && !insideTheString && !insideTheSingleLineComment && !insideTheDocComment && !insideTheMultiLineComment) {
                
                theCode = theCode.slice(0, index) + "<stringDollar>" + theCode.slice(index, index + 1) + "</stringDollar>" + theCode.slice(index + 1); // 1 is length of $
                index = index + "<stringDollar>".length + "</stringDollar>".length;
            }
        }
        
        return theCode;
    }

    function addColorSpanTags(theCode, tag, span) {
        
        theCode = theCode.replaceAll(`<${tag}>`, `<${tag}>${span}`);
        theCode = theCode.replaceAll(`</${tag}>`, `</span></${tag}>`);

        return theCode;
    };

    function colorize(theCode) {
        
        let divPreStart = '<div style=\"background: #ffffff; overflow:auto;width:auto;padding:.2em .6em;\"><pre style=\"margin: 0; line-height: 125%\">';
        let divPreEnd = '</pre></div>';

        theCode = specialCharsShielding(theCode);
        theCode = detectCommentsAndStrings(theCode);
        theCode = addColorSpanTags(theCode, highlightColors.singleLineComment, "<span style=\"color: #008000\">");
        theCode = addColorSpanTags(theCode, "docComment", "<span style=\"color: #90b493\">");
        theCode = addColorSpanTags(theCode, "string", "<span style=\"color: #D6092D\">");
        theCode = addColorSpanTags(theCode, "multiLineComment", "<span style=\"color: #008000\">");
        theCode = addColorSpanTags(theCode, "stringDollar", "<span style=\"color: #913831\">");
        theCode = detectStdKeywords(theCode);
        //theCode = highlightCustomTypes(theCode); 
        //theCode = highlightNonStaticMethods(theCode); <methodName><span style="color: #7c3f00"> <span style="color: #0b856c">
        //theCode = highlightStaticMethods(theCode); <span style="color: #0000FF"> <span style="color: #058BB9"> <span style="color: #B209D6">
        
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