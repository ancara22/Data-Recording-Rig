const app = new Vue({
    el: '#app',
    data: {
        pageContent: 'data',
        graphInterval: null
    },
    mounted() {
        this.getGSRdata();
    },

    watch: {
        pageContent: function(oldPage, newPage) {
            if(newPage =='data') {
                this.graphInterval = setInterval(()=> {
                    this.getGSRdata()
                },1000)

            } 
            
            if(oldPage == 'data' && newPage != 'data'){
                clearInterval(graphInterval);
            }
            
        }
    },

    methods: {
       getGSRdata() {
            fetch('/gsrData')
            .then(res => res.json())
            .then(data => {
                let layout = { title: 'GSR Data Graph', xaxis: { title: 'Timestamp' }, yaxis: { title: 'GSR' } };
                let trace = { type: 'scatter', mode: 'lines', x: data.gsr_data.map(row => new Date(row[0])), y: data.gsr_data.map(row => row[1]) };
                Plotly.newPlot('gsrGraph', [trace], layout);
            })
            .catch(error => console.error('Error fetching GSR data:', error));
           

            
       
       }
    }
})



