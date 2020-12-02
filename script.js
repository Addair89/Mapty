'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in miles
    this.duration = duration; //in mins
  }

  //-----------------------------------METHOD
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //prettier-ignore
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//------------------------APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  //constructure executes as soon as App Loads.
  //------------------------------------CONSTRUCTOR
  constructor() {
    //GET USERS POSITION---------------------------------------------
    this._getPosition();
    //GET DATA FROM LOCALE STORAGE----------------------------------
    this._getLocalStorage();
    //ATTACHING EVENT HANDLERS-------------------------------------------
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  //-----------------------------------------------------METHOD
  //this displays the users local map
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
  }

  //------------------------------------------------------METHOD
  _loadMap(position) {
    console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    //leaflet needs array coordinates to desplay the map
    const coords = [latitude, longitude];
    //inserting coords here
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    ///Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //render any markers that may be in locale storage after map has loaded
    this.#workouts.forEach(work => {
      this._renderWorkOutMarker(work);
    });
  }

  //-------------------------------------------------------METHOD
  _showForm(mapE) {
    //coping the event to a global variable. We neeed it in another handler outside this scope
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //-------------------------------------------------------METHOD
  _hideForm() {
    //empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //------------------------------------------------------METHOD
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //--------------------------------------------------METHOD
  _newWorkout(e) {
    ///if any of the inputs in the form is not a finite number this returns false
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    e.preventDefault();
    //check to see if numbers are positive except elevGain
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    //getting the coords from the dom object api
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if running then create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(
          'Please Fill in all inputs and Inputs have to be positive numbers'
        );

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //if cycling then create cycling object
    if (type === 'cycling') {
      const elevGain = +inputElevation.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, elevGain) ||
        !allPositive(distance, duration)
      )
        return alert(
          'Please Fill in all inputs and Inputs have to be positive numbers'
        );
      workout = new Cycling([lat, lng], distance, duration, elevGain);
    }

    //add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    //render workout on map as marker
    this._renderWorkOutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //hide form and clear input fields
    this._hideForm();

    //set locale storage to all workouts
    this._setLocalStorage();
  }

  //------------------------------------------Method
  _renderWorkOutMarker(workout) {
    //display the marker when submitted

    // using those coords with the api to display the marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  //------------------------------------------Method
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">mi</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/mi</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">mi/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        druration: 1,
      },
    });
  }
  //----------------------------------------------METHOD
  _setLocalStorage() {
    //setting the locale storage as a string with JSON
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  //----------------------------------------------METHOD
  //this method gets called as soon as page loads
  _getLocalStorage() {
    //getting the local storage and converting back to object with JSON.parse
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    //if there is data then we build the workout array from data
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//building the House
const app = new App();
