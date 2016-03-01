/**
 * Introduction:
 * This sample will connect to Qlik Sense, fetch two seperate hypercube to power two d3 visualizations.
 * Render a list of values from fields in Qlik Sense and also bind data points in Qlik Sense to buttons to perform selections/filtering of the data.
 */


/**
 * Since our page loads the Qlik Sense resources remotely we need 
 * to define our base path to point to the Qlik Sense server. 
 * Note that this example uses a virtual proxy with the prefix anon
 * 
 * We can also define local packages.
 * See: http://requirejs.org/docs/api.html#config
 */

require.config({
    baseUrl: 'https://branch.qlik.com/anon/resources/'
});

/**
 * Define a config object that will be used to tell the API which server we are accessing
 */

var qlikconfig = {
    host: 'branch.qlik.com',
    isSecure: true,
    prefix: '/anon/',
    port: 443 //Optional if 80/443
};

/**
 * Application entry point.
 * Load the Qlik JS Api, jquery (which is bundled in Qlik) and D3.
 * 
 * Qlik JS API reference: http://help.qlik.com/en-US/sense-developer/2.1/Subsystems/APIs/Content/mashup-api-reference.htm
 */
require(['js/qlik', 'jquery', 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.16/d3.min.js'], function(qlik, $, d3) {
   
   // Open a Qlik Sense app - This app contains US Breweries, their beers and reviews.
   var app = qlik.openApp('3f3a866b-238f-4d1a-8aeb-81e97756af7a', qlikconfig);
   
   // When Clear Selections Button is clicked, clear selection state.
   $('#clear').click(function() {
       app.clearAll();
   });
   
   /**
    * In this scenario we will use Qliks field interface which is syntactic suger 
    * over a GenericObject with a qListObjectDef.
    * http://help.qlik.com/en-US/sense-developer/2.1/Subsystems/APIs/Content/MashupAPI/qlik-field-interface.htm
    */
   
   // Get a reference to a field in the Qlik Sense data model.
   var state = app.field('State_Full'), brewery = app.field('Brewery');
   
   //Cache jquery element on field reference so we can reuse the same render function.
   state.element = $('#state'); 
   brewery.element = $('#brewery');

   // We wait for the field to bind, then we fetch properties (a more efficient way would be to use method applyPatches())
   // and tell the field to sort the list values based on state so we promote available values to the top of the list.
   // This is totally optional and not needed for the app to function properly.
   brewery.waitFor.then(function() {
     return brewery.genericObject.getProperties().then(function(props) {
         props.qListObjectDef.qDef.qSortCriterias = [{
             qSortByState: 1
         }]
         return brewery.genericObject.setProperties(props)
     });
   });

   // When field recieves data bind the function renderfilter to render our data.
   state.OnData.bind(renderfilter);
   brewery.OnData.bind(renderfilter);
   
   function renderfilter() {
      
      var that = this;
      
      // Map available data rows into a list.
      // Rows: http://help.qlik.com/en-US/sense-developer/2.1/Subsystems/APIs/Content/TableAPI/QDimensionCell.htm
      var $ul = $('<ul class="list" />');
      $ul.html(this.rows.map(function(d) {
        return '<li data-elem="' + d.qElemNumber + '" class="' + d.qState + ' listitem">' + d.qText + '</li>'
      }));
      
      // When a listitem is clicked, select the value in Qlik
      // Allowing selections on Excluded values which has the potential of inverting selections, take note.
      $ul.find('li').on('click', function() {
        that.select([+$(this).attr('data-elem')], true);
      });

      // Empty the element and re-draw
      $(this.element).empty().append($ul);
      
   };
   
   // Fetch some data for fields. This will trigger the initial rendering of filters.
   state.getData();
   brewery.getData({rows: 10000});
   
   /** End of Filter Scenario */
   
   
   /**
    * In this scenario we will create a hypercube construct on the server.
    * This construct will contain dimensions (columns) and measures (calculations) that will be evaluated based
    * on the available data in the data model, based on selection state.
    * The data will be rendered using D3js.
    */
    
    // Chart Dimensions
    var margin = {top: 10, right: 20, bottom: 30, left: 40},
    width = $('#chart1').width() - margin.left - margin.right,
    height = ($('#chart1').height() - 20) - margin.top - margin.bottom;
    
    // Scales
    var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
    var y = d3.scale.linear().range([height, 0]);
    
    // Axis's
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left');
    
    // Chart Title
    var title = d3.select('#chart1').append('p');
    
    // Our chart canvas
    var svg = d3.select('#chart1').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
    
    /**
     * Create the Qlik Sense HyperCube construct. In this scenario we create a nested drill group
     * that will allow users to drill their way into the heirarchical data.
     * We sort the dimensional values based on the expression, in this case the number of unique breweries.
     * We also define a initial page of data to be fetched together with the first layout. 
     * For this demo we will never have to page data.
     * 
     * http://help.qlik.com/en-US/sense-developer/2.1/Subsystems/EngineAPI/Content/GenericObject/PropertyLevel/HyperCubeDef.htm
     */
    app.createCube({
        qDimensions : [{
            qNullSuppression: true,
            qDef : {
                qGrouping: 'H',
                qFieldDefs : ['Region','Division','State','City']
            }
        }],
        qMeasures : [{
            qDef : {
                qDef : '=Count(DISTINCT Brewery)'
            }
        }],
        qInterColumnSortOrder: [1,0], // Sort by measure
        qInitialDataFetch : [{
            qTop : 0,
            qLeft : 0,
            qHeight : 5000,
            qWidth : 2
        }]
    }).then(function(model) {
        // We listen for the Validated event, i.e new data.
        model.Validated.bind(function() {
            // We now have access to the initial data page and the model of the object.
            // Bound to 'this' keyword.
            var _this = this;
            var data = this.layout.qHyperCube;
            var dataPages = data.qDataPages[0].qMatrix;
            
            // Map over data, return the textual value of the first column (i.e our dimension).
            x.domain(dataPages.map(function(d) { return d[0].qText; }));
            // Qlik Sense gives you min and max values for calculations.
            y.domain([0, data.qMeasureInfo[0].qMax]);
            
            title.text(data.qGrandTotalRow[0].qText + ' brewers in ' + dataPages.length + ' ' + data.qDimensionInfo[0].qFallbackTitle + 's')
                
            svg.select(".yaxis")
                .transition()
                .duration(1500)
                .ease("sin-in-out") 
                .call(yAxis);  

            var bar = svg.selectAll('.bar').data(dataPages, function(d) {
                return d[0].qText
            });
            
            bar.exit().remove();
            
            bar.enter().append('rect')
                .attr('class', 'bar')
                .attr('id', function(d) { return d[0].qElemNumber; })
                .attr('x', function(d) { return x(d[0].qText); })
                .attr('width', x.rangeBand())
                .attr('y', height)
                .attr('height', 0)
                .on('click', function(d) {
                    return _this.selectHyperCubeValues('/qHyperCubeDef', 0, [d[0].qElemNumber], true);
                })
                .transition()
                .duration(750)
                .attr('y', function(d) { return y(d[1].qNum); })
                .attr('height', function(d) { return height - y(d[1].qNum); });
                
            d3.transition(svg).select(".x.axis").call(xAxis);
            
        })
    })
 
 
});