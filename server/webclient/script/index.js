const app = new Vue({
    el: '#app',
    data: {
        pageContent: 'settings',
        graphInterval: null,
        rigActive: false,
        statusText: 'ONLINE',
        startTime: '0000.00.00 00:00'
    },
    mounted() {
        if(this.pageContent =='data') {
            this.getGSRdata();
        } else {
            clearInterval(this.graphInterval);
        } 
    },
    watch: {
        pageContent: function(newPage, oldPage) {
            if(oldPage == 'data'){
                clearInterval(this.graphInterval);
            }

            if(newPage == 'data') {
                this.getGSRdata();

                this.graphInterval = setInterval(()=> {
                    this.getGSRdata()
                },1000)
            } 
        }
    },

    methods: {
        changeStatus() {
            this.rigActive = !this.rigActive;

            if(this.rigActive != true) {
                this.statusText = 'OFFLINE';
                this.startTime = '0000.00.00 00:00';
            } else {
                this.statusText = 'ONLINE';
                this.startTime = '2023.15.11 23:32';
            }
        },

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



