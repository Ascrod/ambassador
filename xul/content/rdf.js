/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
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
 * The Original Code is Chatzilla
 *
 * The Initial Developer of the Original Code is New Dimensions Consulting,
 * Inc. Portions created by New Dimensions Consulting, Inc. are
 * Copyright (C) 1999 New Dimenstions Consulting, Inc. All
 * Rights Reserved.
 *
 * Contributor(s):
 *  Robert Ginda, rginda@ndcico.com, original author
 */

const RES_PFX = "http://home.netscape.com/NC-irc#";

const nsIRDFResource = Components.interfaces.nsIRDFResource;
const nsIRDFNode = Components.interfaces.nsIRDFNode;

function RDFHelper()
{
    const RDF_MEMORYDS_CONTRACTID =
        "@mozilla.org/rdf/datasource;1?name=in-memory-datasource";
    const RDF_DS_IID = Components.interfaces.nsIRDFDataSource;

    const RDF_DS_CONTRACTID = "@mozilla.org/rdf/rdf-service;1";
    const RDF_SVC_IID = Components.interfaces.nsIRDFService;

    this.ds =
        Components.classes[RDF_MEMORYDS_CONTRACTID].createInstance(RDF_DS_IID);
    this.svc = 
        Components.classes[RDF_DS_CONTRACTID].getService(RDF_SVC_IID);    

    /* predefined nodes */
    this.resRoot     = this.svc.GetResource ("NC:chatzilla-data");
    this.resNullUser = this.svc.GetResource (RES_PFX + "NUSER");
    this.resNullChan = this.svc.GetResource (RES_PFX + "NCHAN");

    /* predefined arcs */
    this.resNetwork  = this.svc.GetResource (RES_PFX + "network");
    this.resServer   = this.svc.GetResource (RES_PFX + "server");
    this.resChannel  = this.svc.GetResource (RES_PFX + "channel");
    this.resChanUser = this.svc.GetResource (RES_PFX + "chanuser");
    this.resOp       = this.svc.GetResource (RES_PFX + "op");
    this.resVoice    = this.svc.GetResource (RES_PFX + "voice");
    this.resNick     = this.svc.GetResource (RES_PFX + "nick");
    this.resUser     = this.svc.GetResource (RES_PFX + "user");
    this.resHost     = this.svc.GetResource (RES_PFX + "host");

    /* predefined literals */
    this.litTrue     = this.svc.GetLiteral ("true");
    this.litFalse    = this.svc.GetLiteral ("false");
    this.litUnk      = this.svc.GetLiteral ("----"); 

    this.ds.Assert (this.resNullUser, this.resOp, this.litFalse, true);
    this.ds.Assert (this.resNullUser, this.resVoice, this.litFalse, true);
    this.ds.Assert (this.resNullUser, this.resNick, this.litUnk, true);
    this.ds.Assert (this.resNullUser, this.resUser, this.litUnk, true);
    this.ds.Assert (this.resNullUser, this.resHost, this.litUnk, true);
    /*
    this.ds.Assert (this.resNullChan, this.resChanUser, this.resNullUser, true);
    */
    this.ds.Assert (this.resRoot, this.resChannel, this.resNullChan, true);
    
}

RDFHelper.prototype.GetResource =
function rdf_getr (s)
{
    return this.svc.GetResource(s);
}

RDFHelper.prototype.GetLiteral =
function rdf_getl (s)
{
    return this.svc.GetLiteral(s);
}

RDFHelper.prototype.Assert =
function rdf_assert (n1, a, n2, f)
{

    if (typeof f == "undefined")
        f = true;

        //return this.dAssert (n1, a, n2, f);
    return this.ds.Assert (n1, a, n2, f);
}

RDFHelper.prototype.Unassert =
function rdf_uassert (n1, a, n2)
{
    /*return this.dUnassert (n1, a, n2);*/
    return this.ds.Unassert (n1, a, n2);
}

RDFHelper.prototype.dAssert =
function rdf_dassert (n1, a, n2, f)
{
    var n1v = n1 ? n1.Value : "!!!";
    var av = a ? a.Value : "!!!";
    var n2v = n2 ? n2.Value : "!!!";
    
    if (!n1 || !a || !n2)
        dd(getStackTrace());
    
    this.ds.Assert (n1, a, n2, f)
}

RDFHelper.prototype.dUnassert =
function rdf_duassert (n1, a, n2)
{

    var n1v = n1 ? n1.Value : "!!!";
    var av = a ? a.Value : "!!!";
    var n2v = n2 ? n2.Value : "!!!";
    
    if (!n1 || !a || !n2)
        dd(getStackTrace());
    
    this.ds.Unassert (n1, a, n2)

}

RDFHelper.prototype.Change =
function rdf_duassert (n1, a, n2)
{

    var oldN2 = this.ds.GetTarget (n1, a, true);
    if (!oldN2)
    {
        dd ("** Unable to change " + n1.Value + " -[" + a.Value + "]->, " +
            "because old value was not found.");
        return null;
    }
    
    return this.ds.Change (n1, a, oldN2, n2);
    
}

RDFHelper.prototype.clearTargets =
function rdf_inittree (n1, a, recurse)
{
    if (typeof recurse == "undefined")
        recurse = false;

    var targets = this.ds.GetTargets(n1, a, true);

    while (targets.hasMoreElements())
    {
        var n2 = targets.getNext().QueryInterface(nsIRDFNode);

        if (recurse)
        {
            try
            {
                var resN2 = n2.QueryInterface(nsIRDFResource);
                var arcs = this.ds.ArcLabelsOut(resN2);

                while (arcs.hasMoreElements())
                {
                    arc = arcs.getNext().QueryInterface(nsIRDFNode);
                    this.clearTargets (resN2, arc, true);
                }
            }
            catch (e)
            {
                /*
                dd ("** Caught " + e + " while recursivley clearing " +
                    n2.Value + " **");
                */
            }
        }
        
        this.Unassert (n1, a, n2);
    }
}        
    

RDFHelper.prototype.initTree =
function rdf_inittree (id)
{
    var tree = document.getElementById (id);
    tree.database.AddDataSource (this.ds);
}

RDFHelper.prototype.setTreeRoot =
function rdf_settroot (id, root)
{
    var tree = document.getElementById (id);

    if (typeof root == "object")
        root = root.Value;
    tree.setAttribute ("ref", root);
}

RDFHelper.prototype.getTreeRoot =
function rdf_gettroot (id, root)
{
    var tree = document.getElementById (id);

    return tree.getAttribute ("ref");
}
