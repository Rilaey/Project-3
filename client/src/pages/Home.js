import React, { useState, useEffect } from 'react';
import getProducts from '../data/products';
import Card from '../components/Card';




export default function Home() {

  return (
    <div className='card-container justify-center items-center flex flex-wrap'>
      {getProducts().map(product => (
        <Card className="card" key={product.id} title={product.title} description={product.description} price={product.price} image={product.image}/>
      ))}
    </div>
  )
}
