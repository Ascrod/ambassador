/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 *
 * The Original Code is JSIRC Test Client #3
 *
 * The Initial Developer of the Original Code is New Dimensions Consulting,
 * Inc. Portions created by New Dimensions Consulting, Inc. are
 * Copyright (C) 1999 New Dimenstions Consulting, Inc. All
 * Rights Reserved.
 *
 * Contributor(s): 
 *
 *
 * Contributor(s):
 *  Robert Ginda, rginda@ndcico.com, original author
 */

function CMungerEntry (name, regex, className, tagName)
{
    
    this.name = name;
    this.tagName = (tagName) ? tagName : "html:span";

    if (regex instanceof RegExp)
        this.regex = regex;
    else
        this.lambdaMatch = regex;
    
    if (typeof className == "function")
        this.lambdaReplace = className;
    else 
        this.className = className;
    
}

function CMunger () 
{
    
    this.entries = new Object();
    
}

CMunger.prototype.enabled = true;

CMunger.prototype.addRule =
function mng_addrule (name, regex, className)
{
    
    this.entries[name] = new CMungerEntry (name, regex, className);
    
}

CMunger.prototype.delRule =
function mng_delrule (name)
{

    delete this.entries[name];
    
}

CMunger.prototype.munge =
function mng_munge (text, containerTag, eventDetails)
{
    var entry;
    var ary;
    
    if (!containerTag)
        containerTag =
            document.createElementNS ("http://www.w3.org/TR/REC-html40",
                                      this.tagName);

    if (this.enabled)
    {
        for (entry in this.entries)
        {
            if (typeof this.entries[entry].lambdaMatch == "function")
            {
                var rval;
                
                rval = this.entries[entry].lambdaMatch(text, containerTag,
                                                       eventDetails,
                                                       this.entries[entry]);
                if (rval)
                    ary = [(void 0), rval];
                else
                    ary = null;
            }
            else
                ary = text.match(this.entries[entry].regex);
            
            if ((ary != null) && (ary[1]))
            {
                var startPos = text.indexOf(ary[1]);
                
                if (typeof this.entries[entry].lambdaReplace == "function")
                {
                    this.munge (text.substr(0,startPos), containerTag,
                                eventDetails);
                    this.entries[entry].lambdaReplace (ary[1], containerTag,
                                                       eventDetails,
                                                       this.entries[entry]);
                    this.munge (text.substr (startPos + ary[1].length,
                                             text.length), containerTag,
                                eventDetails);
                
                    return containerTag;
                }
                else
                {
                    this.munge (text.substr(0,startPos), containerTag,
                                eventDetails);
                    
                    var subTag = document.createElementNS
                        ("http://www.w3.org/TR/REC-html40",
                         this.entries[entry].tagName);

                    subTag.setAttribute ("class", this.entries[entry].className);
                    subTag.appendChild (document.createTextNode (ary[1]));
                    containerTag.appendChild (subTag);
                    this.munge (text.substr (startPos + ary[1].length,
                                             text.length), containerTag,
                                eventDetails);

                    return containerTag;
                }
            }
        }
    }

    containerTag.appendChild (document.createTextNode (text));
    return containerTag;
    
}
