/**
 * An implementation of a portal.layer.renderer for controlling access to a CSW
 * service endpoint that hasn't been pre-cached.
 */
Ext.define('portal.layer.renderer.cswservice.UncachedCSWServiceRenderer', {
    extend : 'portal.layer.renderer.Renderer',

    config : {
        /**
         *
         */
        icon : null
    },

    constructor : function(config) {
        // this.legend = Ext.create('portal.layer.legend.wfs.WFSLegend', {
        // iconUrl : config.icon ? config.icon.getUrl() : ''
        // });

        // Call our superclass constructor to complete construction process.
        this.callParent(arguments);
    },


    _displayCSWsWithCSWRenderer : function (cswRecords) {
        // This bit is a bit sneaky: we have to store the CSWRecords on this
        // parent layer so that we can make the CSWRenderer use them.
        // We temporarily store the existing records (i.e. the pointer to the
        // CSW endpoint) and then replace it at the end.
        var tempCSWRecords = this.parentLayer.get('cswRecords');
        this.parentLayer.set('cswRecords', cswRecords);

        // Show the results:
        _cswRenderer = Ext.create('portal.layer.renderer.csw.CSWRenderer', {
            map : this.map,
            icon : this.icon,
            polygonColor: this.polygonColor
        });

        _cswRenderer.parentLayer = this.parentLayer;

        var wholeGlobe = Ext.create('portal.util.BBox', {
            northBoundLatitude : 90,
            southBoundLatitude : -90,
            eastBoundLongitude : -180,
            westBoundLongitude : 180
        });

        var emptyFilter = Ext.create('portal.layer.filterer.Filterer', {
            spatialParam : wholeGlobe});

        _cswRenderer.displayData(
                cswRecords,
                emptyFilter,
                undefined);

        // This is where we put the proper CSW record back.
        // If this wasn't done you'd get a problem where you add
        // the layer to the map and apply filter and then try to
        // filter it again. The second filter will be applied to
        // the results of the original request instead of the
        // CSW endpoint itself.
        this.parentLayer.set('cswRecords', tempCSWRecords);
    },



    /**
     * An implementation of the abstract base function. See comments in
     * superclass for more information.
     *
     * function(portal.csw.OnlineResource[] resources,
     * portal.layer.filterer.Filterer filterer,
     * function(portal.layer.renderer.Renderer this, portal.csw.OnlineResource[]
     * resources, portal.layer.filterer.Filterer filterer, bool success)
     * callback
     *
     * returns - void
     *
     * resources - an array of data sources which should be used to render data
     * filterer - A custom filter that can be applied to the specified data
     * sources callback - Will be called when the rendering process is completed
     * and passed an instance of this renderer and the parameters used to call
     * this function
     */
    displayData : function(resources, filterer, callback) {
        var pageSize=20;
        this.removeData();
        me = this;
        var cswRecord = this.parentLayer.data.cswRecords[0].data;
        var recordInfoUrl = cswRecord.recordInfoUrl;

        var configuration =Ext.apply({},{
                extraParams : {
                    recordInfoUrl : cswRecord.recordInfoUrl,
                    cswServiceUrl : resources[0].data.url,
                    cqlText : cswRecord.descriptiveKeywords[0],
                    //bbox : filterer.spatialParam,
                    anyText : filterer.parameters.anyText,
                    title : filterer.parameters.title,
                    abstract_ : filterer.parameters.abstract,
                    metadataDateFrom : filterer.parameters.metadata_change_date_from,
                    metadataDateTo : filterer.parameters.metadata_change_date_to,
                    temporalExtentFrom : filterer.parameters.temporal_extent_date_from,
                    temporalExtentTo : filterer.parameters.temporal_extent_date_to,
                },

                pagingConfig:{
                    limit : pageSize,
                    start : 1
                }
        });


        Ext.create('Ext.window.Window', {
            title: 'CSW Record Selection',
            height: 500,
            width: 650,
            layout: 'fit',
            items: [{  // Let's put an empty grid in just to illustrate fit layout
                id : 'pagingPanel1',
                xtype: 'cswpagingpanel',
                cswConfig : configuration,
                layout : 'fit'
            }],

            buttonAlign : 'right',
            buttons : [{
                xtype : 'button',
                text : 'Add All Records',
                iconCls : 'addall',
                handler : function(button, e) {
                    var cswPagingPanel = button.findParentByType('window').getComponent('pagingPanel1');
                    var allStore = cswPagingPanel.getStore();
                    var cswRecords = allStore.getRange();
                    me._displayCSWsWithCSWRenderer(cswRecords);

                }
            },{
                xtype : 'button',
                text : 'Add Selected Records',
                iconCls : 'add',
                handler : function(button, e) {
                    var cswPagingPanel = button.findParentByType('window').getComponent('pagingPanel1');
                    var csw = cswPagingPanel.getSelectionModel().getSelection();
                    me._displayCSWsWithCSWRenderer(csw);
                }
            }]

        }).show();



    },

    /**
     * An abstract function for creating a legend that can describe the
     * displayed data. If no such thing exists for this renderer then null
     * should be returned.
     *
     * function(portal.csw.OnlineResource[] resources,
     * portal.layer.filterer.Filterer filterer)
     *
     * returns - portal.layer.legend.Legend or null
     *
     * resources - (same as displayData) an array of data sources which should
     * be used to render data filterer - (same as displayData) A custom filter
     * that can be applied to the specified data sources
     */
    getLegend : function(resources, filterer) {
        return this.legend;
    },

    /**
     * An abstract function that is called when this layer needs to be
     * permanently removed from the map. In response to this function all
     * rendered information should be removed
     *
     * function()
     *
     * returns - void
     */
    removeData : function() {
        if (typeof(_cswRenderer) != 'undefined' && _cswRenderer != null) {
            _cswRenderer.removeData();
        }

        this.primitiveManager.clearPrimitives();
    },

    /**
     * An abstract function - see parent class for more info
     */
    abortDisplay : function() {
        for (var i = 0; i < this._ajaxRequests.length; i++) {
            Ext.Ajax.abort(this._ajaxRequests[i]);
        }
    }
});